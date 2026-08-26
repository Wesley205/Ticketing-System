const { withTransaction } = require('../utils/transactions');
const { logAction } = require('../utils/audit');
const { emitNotificationEvent } = require('../utils/notificationService');

const MAINTENANCE_TYPES = ['Corrective', 'Preventive', 'Inspection'];
const MAINTENANCE_SCHEDULE_TYPES = ['Preventive', 'Inspection'];
const MAINTENANCE_STATUSES = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];

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

async function loadAssetForUpdate(client, assetId) {
  const result = await client.query(
    `SELECT asset_id, asset_tag, assigned_to, status
     FROM assets
     WHERE asset_id = $1
     FOR UPDATE`,
    [assetId]
  );
  return result.rows[0] || null;
}

async function loadMaintenanceForUpdate(client, maintenanceId) {
  const result = await client.query(
    `SELECT maintenance_id, asset_id, technician_id, schedule_id, status, maintenance_type
     FROM maintenance
     WHERE maintenance_id = $1
     FOR UPDATE`,
    [maintenanceId]
  );
  return result.rows[0] || null;
}

async function loadScheduleForUpdate(client, scheduleId) {
  const result = await client.query(
    `SELECT schedule_id, asset_id, title, frequency_unit, frequency_value, next_due_at,
            assigned_technician_id, reminder_days_before, is_active
     FROM maintenance_schedules
     WHERE schedule_id = $1
     FOR UPDATE`,
    [scheduleId]
  );
  return result.rows[0] || null;
}

async function insertAssetStatusHistory(client, assetId, actorUserId, previousStatus, nextStatus, reason, relatedRecordId) {
  if (previousStatus === nextStatus) return;

  await client.query(
    `INSERT INTO asset_status_history
      (asset_id, actor_user_id, previous_status, next_status, reason, related_record_type, related_record_id)
     VALUES ($1,$2,$3,$4,$5,'maintenance',$6)`,
    [assetId, actorUserId || null, previousStatus || null, nextStatus, reason || null, relatedRecordId || null]
  );
}

async function syncAssetStatusForMaintenance(client, asset, actorUserId, nextStatus, maintenanceId, reason) {
  if (!nextStatus || asset.status === nextStatus) return;

  await client.query(
    'UPDATE assets SET status = $1 WHERE asset_id = $2',
    [nextStatus, asset.asset_id]
  );

  await insertAssetStatusHistory(
    client,
    asset.asset_id,
    actorUserId,
    asset.status,
    nextStatus,
    reason,
    maintenanceId
  );
}

async function createMaintenanceRecord(data) {
  return withTransaction(async (client) => {
    const asset = await loadAssetForUpdate(client, data.asset_id);
    if (!asset) {
      throw new Error('Asset not found.');
    }

    if (data.schedule_id) {
      const schedule = await loadScheduleForUpdate(client, data.schedule_id);
      if (!schedule || Number(schedule.asset_id) !== Number(data.asset_id)) {
        throw new Error('Maintenance schedule not found for this asset.');
      }
    }

    const status = data.status || 'Scheduled';
    const maintenanceType = data.maintenance_type || 'Corrective';
    const inserted = await client.query(
      `INSERT INTO maintenance
        (asset_id, technician_id, problem, action_taken, maintenance_date, cost, status, notes,
         maintenance_type, related_request_id, assigned_by_user_id, schedule_id, scheduled_start_at,
         started_at, completed_at, next_due_at, checklist_json, completion_notes)
       VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING *`,
      [
        data.asset_id,
        data.technician_id || null,
        data.problem,
        data.action_taken || null,
        data.maintenance_date || null,
        data.cost || 0,
        status,
        data.notes || null,
        maintenanceType,
        data.related_request_id || null,
        data.assigned_by_user_id || data.actor_user_id || null,
        data.schedule_id || null,
        data.scheduled_start_at || null,
        status === 'In Progress' ? (data.started_at || new Date()) : (data.started_at || null),
        status === 'Completed' ? (data.completed_at || new Date()) : null,
        data.next_due_at || null,
        JSON.stringify(Array.isArray(data.checklist_items) ? data.checklist_items : []),
        data.completion_notes || null,
      ]
    );

    const created = inserted.rows[0];
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
      const schedule = await loadScheduleForUpdate(client, data.schedule_id);
      if (schedule) {
        const nextDue = calculateNextMaintenanceDueAt(schedule, created.completed_at || new Date());
        await client.query(
          `UPDATE maintenance_schedules
           SET last_completed_at = COALESCE($2, NOW()),
               last_generated_at = NOW(),
               next_due_at = $3,
               archived_at = NULL
           WHERE schedule_id = $1`,
          [data.schedule_id, created.completed_at || null, nextDue]
        );
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
        action_url: `/maintenance.html#maintenance-${created.maintenance_id}`,
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

    return created;
  });
}

async function updateMaintenanceRecord(maintenanceId, updates, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await loadMaintenanceForUpdate(client, maintenanceId);
    if (!existing) return null;

    const asset = await loadAssetForUpdate(client, existing.asset_id);
    const nextStatus = updates.status || existing.status;
    const result = await client.query(
      `UPDATE maintenance SET
        action_taken = COALESCE($1, action_taken),
        cost = COALESCE($2, cost),
        status = COALESCE($3, status),
        notes = COALESCE($4, notes),
        technician_id = COALESCE($5, technician_id),
        scheduled_start_at = COALESCE($6, scheduled_start_at),
        started_at = CASE
          WHEN COALESCE($3, status) = 'In Progress' AND started_at IS NULL THEN NOW()
          ELSE COALESCE($7, started_at)
        END,
        completed_at = CASE
          WHEN COALESCE($3, status) = 'Completed' THEN COALESCE($8, NOW())
          ELSE completed_at
        END,
        next_due_at = COALESCE($9, next_due_at),
        checklist_json = COALESCE($10, checklist_json),
        completion_notes = COALESCE($11, completion_notes)
       WHERE maintenance_id = $12
       RETURNING *`,
      [
        updates.action_taken,
        updates.cost,
        updates.status,
        updates.notes,
        updates.technician_id,
        updates.scheduled_start_at,
        updates.started_at,
        updates.completed_at,
        updates.next_due_at,
        Array.isArray(updates.checklist_items) ? JSON.stringify(updates.checklist_items) : null,
        updates.completion_notes,
        maintenanceId,
      ]
    );

    const updated = result.rows[0];
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
      const schedule = await loadScheduleForUpdate(client, updated.schedule_id);
      if (schedule) {
        const nextDue = calculateNextMaintenanceDueAt(schedule, updated.completed_at || new Date());
        await client.query(
          `UPDATE maintenance_schedules
           SET last_completed_at = COALESCE($2, NOW()),
               last_generated_at = NOW(),
               next_due_at = $3,
               archived_at = NULL
           WHERE schedule_id = $1`,
          [updated.schedule_id, updated.completed_at || null, nextDue]
        );
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
        action_url: `/maintenance.html#maintenance-${maintenanceId}`,
      },
      client
    );

    await logAction(actorUserId, 'Maintenance record updated', 'maintenance', maintenanceId, `Status: ${nextStatus}`, client);
    return updated;
  });
}

async function createMaintenanceScheduleRecord(data) {
  return withTransaction(async (client) => {
    const asset = await loadAssetForUpdate(client, data.asset_id);
    if (!asset) {
      throw new Error('Asset not found.');
    }

    const inserted = await client.query(
      `INSERT INTO maintenance_schedules
        (asset_id, title, description, maintenance_type, frequency_unit, frequency_value,
         next_due_at, assigned_technician_id, assigned_by_user_id, reminder_days_before, checklist_json, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,TRUE)
       RETURNING *`,
      [
        data.asset_id,
        data.title,
        data.description || null,
        data.maintenance_type || 'Preventive',
        data.frequency_unit || 'days',
        data.frequency_value || 30,
        data.next_due_at,
        data.assigned_technician_id || null,
        data.assigned_by_user_id || data.actor_user_id || null,
        data.reminder_days_before ?? 3,
        JSON.stringify(Array.isArray(data.checklist_items) ? data.checklist_items : []),
      ]
    );

    await logAction(
      data.actor_user_id,
      'Maintenance schedule created',
      'maintenance_schedule',
      inserted.rows[0].schedule_id,
      `${inserted.rows[0].title} for asset ${asset.asset_tag}`,
      client
    );

    return inserted.rows[0];
  });
}

async function updateMaintenanceScheduleRecord(scheduleId, updates, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await loadScheduleForUpdate(client, scheduleId);
    if (!existing) return null;

    const result = await client.query(
      `UPDATE maintenance_schedules
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           maintenance_type = COALESCE($3, maintenance_type),
           frequency_unit = COALESCE($4, frequency_unit),
           frequency_value = COALESCE($5, frequency_value),
           next_due_at = COALESCE($6, next_due_at),
           assigned_technician_id = COALESCE($7, assigned_technician_id),
           reminder_days_before = COALESCE($8, reminder_days_before),
           checklist_json = COALESCE($9, checklist_json),
           is_active = COALESCE($10, is_active),
           archived_at = CASE WHEN COALESCE($10, is_active) = FALSE THEN COALESCE(archived_at, NOW()) ELSE NULL END
       WHERE schedule_id = $11
       RETURNING *`,
      [
        updates.title,
        updates.description,
        updates.maintenance_type,
        updates.frequency_unit,
        updates.frequency_value,
        updates.next_due_at,
        updates.assigned_technician_id,
        updates.reminder_days_before,
        Array.isArray(updates.checklist_items) ? JSON.stringify(updates.checklist_items) : null,
        Object.prototype.hasOwnProperty.call(updates, 'is_active') ? updates.is_active : null,
        scheduleId,
      ]
    );

    await logAction(
      actorUserId,
      'Maintenance schedule updated',
      'maintenance_schedule',
      scheduleId,
      result.rows[0].title,
      client
    );

    return result.rows[0];
  });
}

async function listMaintenanceSchedules(executor, filters = {}) {
  const clauses = [];
  const params = [];

  if (filters.asset_id) {
    params.push(filters.asset_id);
    clauses.push(`ms.asset_id = $${params.length}`);
  }
  if (filters.is_active !== undefined) {
    params.push(filters.is_active);
    clauses.push(`ms.is_active = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await executor.query(
    `SELECT ms.*, a.asset_tag, a.asset_type, u.full_name AS technician_name
     FROM maintenance_schedules ms
     JOIN assets a ON a.asset_id = ms.asset_id
     LEFT JOIN users u ON u.user_id = ms.assigned_technician_id
     ${where}
     ORDER BY ms.next_due_at ASC, ms.schedule_id DESC`,
    params
  );
  return result.rows;
}

module.exports = {
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  calculateNextMaintenanceDueAt,
  createMaintenanceRecord,
  createMaintenanceScheduleRecord,
  listMaintenanceSchedules,
  resolveAssetStatusAfterMaintenance,
  updateMaintenanceRecord,
  updateMaintenanceScheduleRecord,
};
