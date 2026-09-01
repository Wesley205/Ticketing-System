const pool = require('../../config/db');
const AppError = require('../../errors/AppError');
const { ERROR_CODES } = require('../../errors/errorCodes');
const { withTransaction } = require('../../utils/transactions');
const { logAction } = require('../../utils/audit');
const { emitNotificationEvent } = require('../../utils/notificationService');
const mapper = require('./maintenance.mapper');
const policy = require('./maintenance.policy');
const repository = require('./maintenance.repository');
const {
  MAINTENANCE_ERROR_MESSAGES,
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
} = require('./maintenance.constants');

function badRequest(message) {
  return new AppError({ code: ERROR_CODES.BAD_REQUEST, statusCode: 400, message });
}

function forbidden(message) {
  return new AppError({ code: ERROR_CODES.AUTHORIZATION_FAILED, statusCode: 403, message });
}

function addInterval(date, frequencyUnit, frequencyValue) {
  const base = new Date(date);
  const next = new Date(base);

  if (frequencyUnit === 'weeks') {
    next.setDate(next.getDate() + (frequencyValue * 7));
    return next;
  }
  if (frequencyUnit === 'months') {
    next.setMonth(next.getMonth() + frequencyValue);
    return next;
  }

  next.setDate(next.getDate() + frequencyValue);
  return next;
}

function calculateNextMaintenanceDueAt(schedule, referenceDate = new Date()) {
  return addInterval(referenceDate, schedule.frequency_unit, Number(schedule.frequency_value));
}

function resolveAssetStatusAfterMaintenance(existingAsset, updates = {}) {
  if (updates.asset_status_override) {
    return updates.asset_status_override;
  }

  if (updates.status === 'Completed') {
    return existingAsset.assigned_to ? 'Assigned' : 'Available';
  }

  if (updates.status === 'Cancelled') {
    return existingAsset.assigned_to ? 'Assigned' : 'Available';
  }

  return 'Under Maintenance';
}

async function syncAssetStatusForMaintenance(client, asset, actorUserId, nextStatus, maintenanceId, reason) {
  if (!nextStatus || asset.status === nextStatus) return;

  await repository.updateAssetStatus(client, asset.asset_id, nextStatus);
  await repository.insertAssetStatusHistory(
    client,
    asset.asset_id,
    actorUserId,
    asset.status,
    nextStatus,
    reason,
    maintenanceId
  );
}

async function listMaintenanceRecords(filters = {}, actorUser, executor = pool) {
  const rows = await repository.listMaintenance(
    executor,
    filters,
    policy.buildMaintenanceVisibility(actorUser)
  );
  return rows.map(mapper.mapMaintenanceRow);
}

async function listSchedulesForActor(filters = {}, actorUser, executor = pool) {
  const schedules = await repository.listMaintenanceSchedules(executor, filters);
  return schedules.filter((schedule) => policy.canCreateMaintenance(actorUser, schedule)).map(mapper.mapScheduleRow);
}

async function createMaintenanceRecord(data, executor) {
  return withTransaction(async (client) => {
    const asset = await repository.loadAssetForUpdate(client, data.asset_id);
    if (!asset) {
      throw badRequest(MAINTENANCE_ERROR_MESSAGES.assetNotFound);
    }

    if (data.schedule_id) {
      const schedule = await repository.loadScheduleForUpdate(client, data.schedule_id);
      if (!schedule || Number(schedule.asset_id) !== Number(data.asset_id)) {
        throw badRequest('Maintenance schedule not found for this asset.');
      }
    }

    const status = data.status || 'Scheduled';
    const maintenanceType = data.maintenance_type || 'Corrective';
    const created = await repository.insertMaintenance(client, data, status, maintenanceType);
    const nextAssetStatus = resolveAssetStatusAfterMaintenance(asset, { status });

    await syncAssetStatusForMaintenance(
      client,
      asset,
      data.actor_user_id,
      nextAssetStatus,
      created.maintenance_id,
      `Maintenance ${status.toLowerCase()}`
    );

    if (data.schedule_id && status === 'Completed') {
      const schedule = await repository.loadScheduleForUpdate(client, data.schedule_id);
      if (schedule) {
        const nextDue = calculateNextMaintenanceDueAt(schedule, created.completed_at || new Date());
        await repository.updateScheduleAfterCompletion(client, data.schedule_id, created.completed_at || null, nextDue);
      }
    }

    await emitNotificationEvent(
      {
        type: status === 'Completed' ? 'maintenance_completed' : 'maintenance_created',
        title: status === 'Completed' ? 'Maintenance completed' : 'Maintenance scheduled',
        message: `Asset ${asset.asset_tag} maintenance is ${status.toLowerCase()}.`,
        related_record_type: 'maintenance',
        related_record_id: created.maintenance_id,
        recipient_user_ids: [data.technician_id, data.actor_user_id].filter(Boolean),
        payload: {
          asset_id: data.asset_id,
          maintenance_type: maintenanceType,
          status,
        },
        action_url: `/maintenance#maintenance-${created.maintenance_id}`,
      },
      client
    );

    await logAction(
      data.actor_user_id,
      'Maintenance record created',
      'maintenance',
      created.maintenance_id,
      `Asset ${data.asset_id}: ${data.problem}`,
      client
    );

    return mapper.mapMaintenanceRow(created);
  }, executor);
}

async function createMaintenanceForActor(data, actorUser, executor = pool) {
  const asset = await repository.getAssetById(executor, data.asset_id);
  if (!asset) return null;
  if (!policy.canCreateMaintenance(actorUser, asset)) {
    throw forbidden(MAINTENANCE_ERROR_MESSAGES.createForbidden);
  }

  const effectiveTechnicianId = actorUser.role === 'technician'
    ? actorUser.user_id
    : (data.technician_id || actorUser.user_id);

  return createMaintenanceRecord({
    ...data,
    actor_user_id: actorUser.user_id,
    technician_id: effectiveTechnicianId,
    maintenance_type: data.maintenance_type || 'Corrective',
    related_request_id: data.related_request_id || null,
    schedule_id: data.schedule_id || null,
    assigned_by_user_id: actorUser.user_id,
    scheduled_start_at: data.scheduled_start_at || null,
    next_due_at: data.next_due_at || null,
    checklist_items: Array.isArray(data.checklist_items) ? data.checklist_items : [],
    completion_notes: data.completion_notes || null,
  }, executor);
}

async function updateMaintenanceRecord(maintenanceId, updates, actorUserId, executor) {
  return withTransaction(async (client) => {
    const existing = await repository.loadMaintenanceForUpdate(client, maintenanceId);
    if (!existing) return null;

    const asset = await repository.loadAssetForUpdate(client, existing.asset_id);
    const nextStatus = updates.status || existing.status;
    const updated = await repository.updateMaintenance(client, maintenanceId, updates);
    const nextAssetStatus = resolveAssetStatusAfterMaintenance(asset, {
      status: nextStatus,
      asset_status_override: updates.asset_status_override,
    });

    await syncAssetStatusForMaintenance(
      client,
      asset,
      actorUserId,
      nextAssetStatus,
      maintenanceId,
      `Maintenance ${nextStatus.toLowerCase()}`
    );

    if (updated.schedule_id && nextStatus === 'Completed') {
      const schedule = await repository.loadScheduleForUpdate(client, updated.schedule_id);
      if (schedule) {
        const nextDue = calculateNextMaintenanceDueAt(schedule, updated.completed_at || new Date());
        await repository.updateScheduleAfterCompletion(client, updated.schedule_id, updated.completed_at || null, nextDue);
      }
    }

    await emitNotificationEvent(
      {
        type: nextStatus === 'Completed' ? 'maintenance_completed' : 'maintenance_created',
        title: nextStatus === 'Completed' ? 'Maintenance completed' : 'Maintenance updated',
        message: `Maintenance #${maintenanceId} is now ${nextStatus}.`,
        related_record_type: 'maintenance',
        related_record_id: maintenanceId,
        recipient_user_ids: [updated.technician_id, actorUserId].filter(Boolean),
        payload: {
          asset_id: updated.asset_id,
          status: nextStatus,
          maintenance_type: updated.maintenance_type,
        },
        action_url: `/maintenance#maintenance-${maintenanceId}`,
      },
      client
    );

    await logAction(actorUserId, 'Maintenance record updated', 'maintenance', maintenanceId, `Status: ${nextStatus}`, client);
    return mapper.mapMaintenanceRow(updated);
  }, executor);
}

async function updateMaintenanceForActor(maintenanceId, updates, actorUser, executor = pool) {
  const existing = await repository.getMaintenanceById(executor, maintenanceId);
  if (!existing) return null;
  if (!policy.canUpdateMaintenance(actorUser, existing)) {
    throw forbidden(MAINTENANCE_ERROR_MESSAGES.updateForbidden);
  }
  if (updates.status && !MAINTENANCE_STATUSES.includes(updates.status)) {
    throw badRequest(MAINTENANCE_ERROR_MESSAGES.invalidStatus);
  }

  return updateMaintenanceRecord(maintenanceId, updates, actorUser.user_id, executor);
}

async function createMaintenanceScheduleRecord(data, executor) {
  return withTransaction(async (client) => {
    const asset = await repository.loadAssetForUpdate(client, data.asset_id);
    if (!asset) {
      throw badRequest(MAINTENANCE_ERROR_MESSAGES.assetNotFound);
    }

    const schedule = await repository.insertMaintenanceSchedule(client, data);

    await logAction(
      data.actor_user_id,
      'Maintenance schedule created',
      'maintenance_schedule',
      schedule.schedule_id,
      `${schedule.title} for asset ${asset.asset_tag}`,
      client
    );

    return mapper.mapScheduleRow(schedule);
  }, executor);
}

async function createScheduleForActor(data, actorUser, executor = pool) {
  const asset = await repository.getAssetById(executor, data.asset_id);
  if (!asset) return null;
  if (!policy.canCreateMaintenance(actorUser, asset)) {
    throw forbidden(MAINTENANCE_ERROR_MESSAGES.createScheduleForbidden);
  }

  return createMaintenanceScheduleRecord({
    ...data,
    actor_user_id: actorUser.user_id,
    assigned_by_user_id: actorUser.user_id,
  }, executor);
}

async function updateMaintenanceScheduleRecord(scheduleId, updates, actorUserId, executor) {
  return withTransaction(async (client) => {
    const existing = await repository.loadScheduleForUpdate(client, scheduleId);
    if (!existing) return null;

    const schedule = await repository.updateMaintenanceSchedule(client, scheduleId, updates);

    await logAction(
      actorUserId,
      'Maintenance schedule updated',
      'maintenance_schedule',
      scheduleId,
      schedule.title,
      client
    );

    return mapper.mapScheduleRow(schedule);
  }, executor);
}

async function updateScheduleForActor(scheduleId, updates, actorUser, executor = pool) {
  const existing = await repository.getScheduleById(executor, scheduleId);
  if (!existing) return null;
  if (!policy.canUpdateMaintenance(actorUser, existing) && !policy.canCreateMaintenance(actorUser, existing)) {
    throw forbidden(MAINTENANCE_ERROR_MESSAGES.updateScheduleForbidden);
  }

  return updateMaintenanceScheduleRecord(scheduleId, updates, actorUser.user_id, executor);
}

async function listMaintenanceSchedules(executor, filters = {}) {
  const rows = await repository.listMaintenanceSchedules(executor, filters);
  return rows.map(mapper.mapScheduleRow);
}

module.exports = {
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  calculateNextMaintenanceDueAt,
  createMaintenanceForActor,
  createMaintenanceRecord,
  createMaintenanceScheduleRecord,
  createScheduleForActor,
  listMaintenanceRecords,
  listMaintenanceSchedules,
  listSchedulesForActor,
  resolveAssetStatusAfterMaintenance,
  updateMaintenanceForActor,
  updateMaintenanceRecord,
  updateMaintenanceScheduleRecord,
  updateScheduleForActor,
};
