const pool = require('../../config/db');
const AppError = require('../../errors/AppError');
const { ERROR_CODES } = require('../../errors/errorCodes');
const { withTransaction } = require('../../utils/transactions');
const { logAction } = require('../../utils/audit');
const mapper = require('./asset.mapper');
const policy = require('./asset.policy');
const repository = require('./asset.repository');
const {
  ASSET_CONDITIONS,
  ASSET_ERROR_MESSAGES,
  ASSET_STATUSES,
} = require('./asset.constants');

function badRequest(message) {
  return new AppError({ code: ERROR_CODES.BAD_REQUEST, statusCode: 400, message });
}

function forbidden(message) {
  return new AppError({ code: ERROR_CODES.AUTHORIZATION_FAILED, statusCode: 403, message });
}

function resolveReturnedAssetStatus(options = {}) {
  if (options.target_status && options.target_status !== 'Assigned') {
    return options.target_status;
  }

  if (options.returned_condition === 'Poor') {
    return 'Damaged';
  }

  return 'Available';
}

async function listAssets(filters = {}, actorUser, executor = pool) {
  const rows = await repository.listAssets(executor, filters, policy.buildAssetVisibility(actorUser));
  return rows.map(mapper.mapAssetRow);
}

async function getAssetDetails(assetId, actorUser, executor = pool) {
  const asset = await repository.getAssetById(executor, assetId);
  if (!asset) return null;
  if (!policy.canViewAsset(actorUser, asset)) {
    throw forbidden('You do not have permission to view this asset.');
  }

  const [maintenanceHistory, assignmentHistory, statusHistory, linkedTickets] = await Promise.all([
    repository.listMaintenanceHistory(executor, assetId),
    repository.listAssetAssignmentHistory(executor, assetId),
    repository.listAssetStatusHistory(executor, assetId),
    repository.listLinkedTickets(executor, assetId),
  ]);

  return mapper.mapAssetDetail({
    asset,
    maintenanceHistory,
    assignmentHistory,
    statusHistory,
    linkedTickets,
  });
}

async function createAssetRecord(data, actorUser, executor) {
  return withTransaction(async (client) => {
    let created = await repository.insertAsset(client, data);

    if (data.assigned_to) {
      created = await assignAssetWithinTransaction(client, created.asset_id, data.assigned_to, actorUser.user_id, {
        assignment_notes: 'Initial assignment during asset creation',
      });
    } else if ((data.status || 'Available') !== 'Available') {
      created = await updateAssetStatusWithinTransaction(client, created.asset_id, data.status || 'Available', actorUser.user_id, {
        reason: 'Initial status set during asset creation',
      });
    }

    await logAction(actorUser.user_id, 'Asset created', 'asset', created.asset_id, `Created asset ${created.asset_tag}`, client);
    return mapper.mapAssetRow(created);
  }, executor);
}

async function assignAssetWithinTransaction(client, assetId, assignedTo, actorUserId, details = {}) {
  const existing = await repository.loadAssetForUpdate(client, assetId);
  if (!existing) return null;

  const nextAssignee = assignedTo ? Number(assignedTo) : null;
  const nextStatus = nextAssignee ? 'Assigned' : 'Available';

  if (Number(existing.assigned_to || 0) !== Number(nextAssignee || 0)) {
    await repository.closeActiveAssignment(client, assetId, {
      return_notes: nextAssignee
        ? details.reassignment_notes || 'Closed automatically due to reassignment'
        : details.return_notes || 'Asset unassigned',
      returned_to_user_id: actorUserId,
    });

    await repository.insertAssignment(client, existing, nextAssignee, actorUserId, details);
  }

  const updated = await repository.updateAssetAssignment(client, assetId, nextAssignee, nextStatus);

  await repository.insertAssetStatusHistory(
    client,
    assetId,
    actorUserId,
    existing.status,
    nextStatus,
    details.assignment_notes || (nextAssignee ? 'Asset assigned' : 'Asset unassigned')
  );

  await logAction(
    actorUserId,
    nextAssignee ? 'Asset assigned' : 'Asset unassigned',
    'asset',
    assetId,
    nextAssignee ? `Assigned to user_id ${nextAssignee}` : 'Assignment removed',
    client
  );

  return updated;
}

async function assignAssetRecord(assetId, assignedTo, actorUserId, details = {}, executor) {
  return withTransaction((client) => assignAssetWithinTransaction(client, assetId, assignedTo, actorUserId, details), executor);
}

async function assignAssetForActor(assetId, assignedTo, actorUser, details = {}, executor = pool) {
  if (assignedTo) {
    const assignedUser = await repository.findUserState(executor, assignedTo);
    if (!assignedUser || !assignedUser.is_active) {
      throw badRequest(ASSET_ERROR_MESSAGES.userInactive);
    }
  }

  return assignAssetRecord(assetId, assignedTo || null, actorUser.user_id, details, executor);
}

async function returnAssetRecord(assetId, actorUserId, details = {}, executor) {
  return withTransaction(async (client) => {
    const existing = await repository.loadAssetForUpdate(client, assetId);
    if (!existing) return null;

    const nextStatus = resolveReturnedAssetStatus(details);
    await repository.closeActiveAssignment(client, assetId, {
      return_notes: details.return_notes || 'Asset returned',
      returned_condition: details.returned_condition || null,
      returned_to_user_id: actorUserId,
    });

    const updated = await repository.updateAssetReturn(client, assetId, details.returned_condition || null, nextStatus);

    await repository.insertAssetStatusHistory(
      client,
      assetId,
      actorUserId,
      existing.status,
      nextStatus,
      details.return_notes || 'Asset returned to stock'
    );

    await logAction(
      actorUserId,
      'Asset returned',
      'asset',
      assetId,
      `Returned asset ${existing.asset_tag} with status ${nextStatus}`,
      client
    );

    return mapper.mapAssetRow(updated);
  }, executor);
}

async function returnAssetForActor(assetId, actorUser, details = {}, executor = pool) {
  const existing = await repository.getAssetById(executor, assetId);
  if (!existing) return null;
  if (!existing.assigned_to) {
    throw badRequest(ASSET_ERROR_MESSAGES.returnUnassigned);
  }
  return returnAssetRecord(assetId, actorUser.user_id, details, executor);
}

async function updateAssetStatusWithinTransaction(client, assetId, status, actorUserId, details = {}) {
  if (!ASSET_STATUSES.includes(status)) {
    throw badRequest('Invalid asset status.');
  }

  const existing = await repository.loadAssetForUpdate(client, assetId);
  if (!existing) return null;

  if (status === 'Assigned' && !existing.assigned_to) {
    throw badRequest('Assigned status requires an active assignee.');
  }

  const updated = await repository.updateAssetStatus(client, assetId, status);

  await repository.insertAssetStatusHistory(
    client,
    assetId,
    actorUserId,
    existing.status,
    status,
    details.reason || `Status changed to ${status}`
  );

  await logAction(actorUserId, 'Asset status changed', 'asset', assetId, `Status changed to ${status}`, client);
  return updated;
}

async function updateAssetStatusRecord(assetId, status, actorUserId, details = {}, executor) {
  return withTransaction((client) => updateAssetStatusWithinTransaction(client, assetId, status, actorUserId, details), executor);
}

async function updateAssetStatusForActor(assetId, status, actorUser, executor = pool) {
  const existing = await repository.getAssetById(executor, assetId);
  if (!existing) return null;
  if (!policy.canUpdateAssetStatus(actorUser, existing)) {
    throw forbidden(ASSET_ERROR_MESSAGES.updateStatusForbidden);
  }
  return updateAssetStatusRecord(assetId, status, actorUser.user_id, {}, executor);
}

async function updateAssetRecord(assetId, updates, actorUserId, executor) {
  return withTransaction(async (client) => {
    const existing = await repository.loadAssetForUpdate(client, assetId);
    if (!existing) return null;

    const nextAssignee = Object.prototype.hasOwnProperty.call(updates, 'assigned_to')
      ? (updates.assigned_to ? Number(updates.assigned_to) : null)
      : existing.assigned_to;

    let nextStatus = updates.status || existing.status;
    if (nextAssignee && nextStatus === 'Available') {
      nextStatus = 'Assigned';
    }
    if (!nextAssignee && nextStatus === 'Assigned') {
      nextStatus = 'Available';
    }

    if (Number(existing.assigned_to || 0) !== Number(nextAssignee || 0)) {
      await repository.closeActiveAssignment(client, assetId, {
        return_notes: nextAssignee
          ? 'Closed automatically due to asset edit reassignment'
          : 'Closed automatically due to asset edit unassignment',
        returned_to_user_id: actorUserId,
      });

      await repository.insertAssignment(client, existing, nextAssignee, actorUserId, {
        assignment_notes: updates.assignment_notes || 'Recorded during asset edit',
        expected_return_at: updates.expected_return_at || null,
      });
    }

    const updated = await repository.updateAsset(client, assetId, {
      ...updates,
      assigned_to: nextAssignee,
      status: nextStatus,
    });

    await repository.insertAssetStatusHistory(
      client,
      assetId,
      actorUserId,
      existing.status,
      nextStatus,
      updates.assignment_notes || updates.status_reason || 'Asset record edited'
    );

    await logAction(actorUserId, 'Asset edited', 'asset', assetId, `Updated asset ${updated.asset_tag}`, client);
    return mapper.mapAssetRow(updated);
  }, executor);
}

async function deleteAssetRecord(assetId, actorUser, executor) {
  return withTransaction(async (client) => {
    const deleted = await repository.deleteAsset(client, assetId);
    if (!deleted) return null;

    await logAction(actorUser.user_id, 'Asset deleted', 'asset', assetId, `Deleted asset ${deleted.asset_tag}`, client);
    return { message: ASSET_ERROR_MESSAGES.deleted };
  }, executor);
}

module.exports = {
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  assignAssetForActor,
  assignAssetRecord,
  createAssetRecord,
  deleteAssetRecord,
  getAssetDetails,
  listAssetAssignmentHistory: repository.listAssetAssignmentHistory,
  listAssetStatusHistory: repository.listAssetStatusHistory,
  listAssets,
  listLinkedTickets: repository.listLinkedTickets,
  resolveReturnedAssetStatus,
  returnAssetForActor,
  returnAssetRecord,
  updateAssetRecord,
  updateAssetStatusForActor,
  updateAssetStatusRecord,
};
