const { withTransaction } = require('../utils/transactions');
const { logAction } = require('../utils/audit');

const ASSET_STATUSES = [
  'Active',
  'Available',
  'Assigned',
  'Under Maintenance',
  'Damaged',
  'Retired',
];

const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Poor'];

function resolveReturnedAssetStatus(options = {}) {
  if (options.target_status && options.target_status !== 'Assigned') {
    return options.target_status;
  }

  if (options.returned_condition === 'Poor') {
    return 'Damaged';
  }

  return 'Available';
}

async function loadAssetForUpdate(client, assetId) {
  const result = await client.query(
    `SELECT asset_id, asset_tag, department_id, assigned_to, status, condition
     FROM assets
     WHERE asset_id = $1
     FOR UPDATE`,
    [assetId]
  );
  return result.rows[0] || null;
}

async function insertAssetStatusHistory(client, assetId, actorUserId, previousStatus, nextStatus, reason, related = {}) {
  if (previousStatus === nextStatus) return;

  await client.query(
    `INSERT INTO asset_status_history
      (asset_id, actor_user_id, previous_status, next_status, reason, related_record_type, related_record_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      assetId,
      actorUserId || null,
      previousStatus || null,
      nextStatus,
      reason || null,
      related.record_type || null,
      related.record_id || null,
    ]
  );
}

async function closeActiveAssignment(client, assetId, details = {}) {
  await client.query(
    `UPDATE asset_assignments
     SET is_active = FALSE,
         returned_at = COALESCE($2, NOW()),
         return_notes = COALESCE($3, return_notes, 'Assignment closed'),
         returned_condition = COALESCE($4, returned_condition),
         returned_to_user_id = COALESCE($5, returned_to_user_id)
     WHERE asset_id = $1
       AND is_active = TRUE`,
    [
      assetId,
      details.returned_at || null,
      details.return_notes || null,
      details.returned_condition || null,
      details.returned_to_user_id || null,
    ]
  );
}

async function insertAssignment(client, asset, assignedTo, actorUserId, details = {}) {
  if (!assignedTo) return;

  await client.query(
    `INSERT INTO asset_assignments
      (asset_id, assigned_user_id, assigned_department_id, assigned_by_user_id,
       assigned_at, assignment_notes, expected_return_at, is_active)
     VALUES ($1,$2,$3,$4,NOW(),$5,$6,TRUE)`,
    [
      asset.asset_id,
      assignedTo,
      details.assigned_department_id || asset.department_id || null,
      actorUserId || null,
      details.assignment_notes || 'Recorded during asset assignment operation',
      details.expected_return_at || null,
    ]
  );
}

async function assignAssetRecord(assetId, assignedTo, actorUserId, details = {}) {
  return withTransaction(async (client) => {
    const existing = await loadAssetForUpdate(client, assetId);
    if (!existing) return null;

    const nextAssignee = assignedTo ? Number(assignedTo) : null;
    const nextStatus = nextAssignee ? 'Assigned' : 'Available';

    if (Number(existing.assigned_to || 0) !== Number(nextAssignee || 0)) {
      await closeActiveAssignment(client, assetId, {
        return_notes: nextAssignee
          ? details.reassignment_notes || 'Closed automatically due to reassignment'
          : details.return_notes || 'Asset unassigned',
        returned_to_user_id: actorUserId,
      });

      await insertAssignment(client, existing, nextAssignee, actorUserId, details);
    }

    const updated = await client.query(
      `UPDATE assets
       SET assigned_to = $1,
           status = $2
       WHERE asset_id = $3
       RETURNING *`,
      [nextAssignee, nextStatus, assetId]
    );

    await insertAssetStatusHistory(
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

    return updated.rows[0];
  });
}

async function returnAssetRecord(assetId, actorUserId, details = {}) {
  return withTransaction(async (client) => {
    const existing = await loadAssetForUpdate(client, assetId);
    if (!existing) return null;

    const nextStatus = resolveReturnedAssetStatus(details);
    await closeActiveAssignment(client, assetId, {
      return_notes: details.return_notes || 'Asset returned',
      returned_condition: details.returned_condition || null,
      returned_to_user_id: actorUserId,
    });

    const updated = await client.query(
      `UPDATE assets
       SET assigned_to = NULL,
           condition = COALESCE($1, condition),
           status = $2
       WHERE asset_id = $3
       RETURNING *`,
      [
        details.returned_condition || null,
        nextStatus,
        assetId,
      ]
    );

    await insertAssetStatusHistory(
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

    return updated.rows[0];
  });
}

async function updateAssetStatusRecord(assetId, status, actorUserId, details = {}) {
  if (!ASSET_STATUSES.includes(status)) {
    throw new Error('Invalid asset status.');
  }

  return withTransaction(async (client) => {
    const existing = await loadAssetForUpdate(client, assetId);
    if (!existing) return null;

    if (status === 'Assigned' && !existing.assigned_to) {
      throw new Error('Assigned status requires an active assignee.');
    }

    const updated = await client.query(
      'UPDATE assets SET status = $1 WHERE asset_id = $2 RETURNING *',
      [status, assetId]
    );

    await insertAssetStatusHistory(
      client,
      assetId,
      actorUserId,
      existing.status,
      status,
      details.reason || `Status changed to ${status}`
    );

    await logAction(actorUserId, 'Asset status changed', 'asset', assetId, `Status changed to ${status}`, client);
    return updated.rows[0];
  });
}

async function updateAssetRecord(assetId, updates, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await loadAssetForUpdate(client, assetId);
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
      await closeActiveAssignment(client, assetId, {
        return_notes: nextAssignee
          ? 'Closed automatically due to asset edit reassignment'
          : 'Closed automatically due to asset edit unassignment',
        returned_to_user_id: actorUserId,
      });

      await insertAssignment(client, existing, nextAssignee, actorUserId, {
        assignment_notes: updates.assignment_notes || 'Recorded during asset edit',
        expected_return_at: updates.expected_return_at || null,
      });
    }

    const result = await client.query(
      `UPDATE assets SET
        asset_tag = COALESCE($1, asset_tag),
        asset_type = COALESCE($2, asset_type),
        brand = $3,
        model = $4,
        serial_number = $5,
        department_id = $6,
        assigned_to = $7,
        purchase_date = $8,
        condition = COALESCE($9, condition),
        status = $10,
        location = $11,
        description = $12
       WHERE asset_id = $13
       RETURNING *`,
      [
        updates.asset_tag,
        updates.asset_type,
        updates.brand || null,
        updates.model || null,
        updates.serial_number || null,
        updates.department_id || null,
        nextAssignee,
        updates.purchase_date || null,
        updates.condition || null,
        nextStatus,
        updates.location || null,
        updates.description || null,
        assetId,
      ]
    );

    await insertAssetStatusHistory(
      client,
      assetId,
      actorUserId,
      existing.status,
      nextStatus,
      updates.assignment_notes || updates.status_reason || 'Asset record edited'
    );

    await logAction(actorUserId, 'Asset edited', 'asset', assetId, `Updated asset ${result.rows[0].asset_tag}`, client);
    return result.rows[0];
  });
}

async function listAssetAssignmentHistory(executor, assetId) {
  const result = await executor.query(
    `SELECT aa.assignment_id, aa.asset_id, aa.assigned_user_id, aa.assigned_department_id,
            aa.assigned_by_user_id, aa.assigned_at, aa.expected_return_at, aa.returned_at,
            aa.assignment_notes, aa.return_notes, aa.returned_condition, aa.returned_to_user_id,
            aa.is_active,
            assignee.full_name AS assigned_user_name,
            assigner.full_name AS assigned_by_name,
            receiver.full_name AS returned_to_name,
            d.name AS assigned_department_name
     FROM asset_assignments aa
     LEFT JOIN users assignee ON assignee.user_id = aa.assigned_user_id
     LEFT JOIN users assigner ON assigner.user_id = aa.assigned_by_user_id
     LEFT JOIN users receiver ON receiver.user_id = aa.returned_to_user_id
     LEFT JOIN departments d ON d.department_id = aa.assigned_department_id
     WHERE aa.asset_id = $1
     ORDER BY aa.assigned_at DESC, aa.assignment_id DESC`,
    [assetId]
  );
  return result.rows;
}

async function listAssetStatusHistory(executor, assetId) {
  const result = await executor.query(
    `SELECT ash.asset_status_history_id, ash.asset_id, ash.previous_status, ash.next_status,
            ash.reason, ash.related_record_type, ash.related_record_id, ash.created_at,
            u.full_name AS actor_name
     FROM asset_status_history ash
     LEFT JOIN users u ON u.user_id = ash.actor_user_id
     WHERE ash.asset_id = $1
     ORDER BY ash.created_at DESC, ash.asset_status_history_id DESC`,
    [assetId]
  );
  return result.rows;
}

async function listLinkedTickets(executor, assetId) {
  const result = await executor.query(
    `SELECT request_id, ticket_number, subject, ticket_type, priority, status, date_submitted
     FROM service_requests
     WHERE affected_asset_id = $1
     ORDER BY date_submitted DESC, request_id DESC
     LIMIT 25`,
    [assetId]
  );
  return result.rows;
}

module.exports = {
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  assignAssetRecord,
  listAssetAssignmentHistory,
  listAssetStatusHistory,
  listLinkedTickets,
  resolveReturnedAssetStatus,
  returnAssetRecord,
  updateAssetRecord,
  updateAssetStatusRecord,
};
