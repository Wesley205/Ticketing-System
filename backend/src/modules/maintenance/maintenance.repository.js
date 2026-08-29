const MAINTENANCE_SELECT = `
  SELECT m.*, a.asset_tag, a.asset_type, a.department_id, u.full_name AS technician_name
  FROM maintenance m
  JOIN assets a ON a.asset_id = m.asset_id
  LEFT JOIN users u ON u.user_id = m.technician_id
`;

function buildMaintenanceListQuery(filters = {}, visibility = { clauses: [], params: [] }) {
  const clauses = [...(visibility.clauses || [])];
  const params = [...(visibility.params || [])];

  if (filters.asset_id) {
    params.push(filters.asset_id);
    clauses.push(`m.asset_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`m.status = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return {
    sql: `${MAINTENANCE_SELECT} ${where} ORDER BY m.maintenance_date DESC`,
    params,
  };
}

function buildScheduleListQuery(filters = {}) {
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
  return {
    sql: `SELECT ms.*, a.asset_tag, a.asset_type, u.full_name AS technician_name
     FROM maintenance_schedules ms
     JOIN assets a ON a.asset_id = ms.asset_id
     LEFT JOIN users u ON u.user_id = ms.assigned_technician_id
     ${where}
     ORDER BY ms.next_due_at ASC, ms.schedule_id DESC`,
    params,
  };
}

async function listMaintenance(executor, filters, visibility) {
  const query = buildMaintenanceListQuery(filters, visibility);
  const result = await executor.query(query.sql, query.params);
  return result.rows;
}

async function getAssetById(executor, assetId) {
  const result = await executor.query(
    'SELECT asset_id, department_id, assigned_to, status FROM assets WHERE asset_id = $1',
    [assetId]
  );
  return result.rows[0] || null;
}

async function getMaintenanceById(executor, id) {
  const result = await executor.query(`${MAINTENANCE_SELECT} WHERE m.maintenance_id = $1`, [id]);
  return result.rows[0] || null;
}

async function getScheduleById(executor, id) {
  const result = await executor.query(
    `SELECT ms.*, a.department_id, a.assigned_to, a.asset_tag, a.asset_type,
            u.full_name AS technician_name
     FROM maintenance_schedules ms
     JOIN assets a ON a.asset_id = ms.asset_id
     LEFT JOIN users u ON u.user_id = ms.assigned_technician_id
     WHERE ms.schedule_id = $1`,
    [id]
  );
  return result.rows[0] || null;
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

async function updateAssetStatus(client, assetId, status) {
  await client.query(
    'UPDATE assets SET status = $1 WHERE asset_id = $2',
    [status, assetId]
  );
}

async function insertMaintenance(client, data, status, maintenanceType) {
  const result = await client.query(
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
  return result.rows[0] || null;
}

async function updateMaintenance(client, maintenanceId, updates) {
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
  return result.rows[0] || null;
}

async function updateScheduleAfterCompletion(client, scheduleId, completedAt, nextDue) {
  await client.query(
    `UPDATE maintenance_schedules
     SET last_completed_at = COALESCE($2, NOW()),
         last_generated_at = NOW(),
         next_due_at = $3,
         archived_at = NULL
     WHERE schedule_id = $1`,
    [scheduleId, completedAt || null, nextDue]
  );
}

async function insertMaintenanceSchedule(client, data) {
  const result = await client.query(
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
  return result.rows[0] || null;
}

async function updateMaintenanceSchedule(client, scheduleId, updates) {
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
  return result.rows[0] || null;
}

async function listMaintenanceSchedules(executor, filters = {}) {
  const query = buildScheduleListQuery(filters);
  const result = await executor.query(query.sql, query.params);
  return result.rows;
}

module.exports = {
  buildMaintenanceListQuery,
  buildScheduleListQuery,
  getAssetById,
  getMaintenanceById,
  getScheduleById,
  insertAssetStatusHistory,
  insertMaintenance,
  insertMaintenanceSchedule,
  listMaintenance,
  listMaintenanceSchedules,
  loadAssetForUpdate,
  loadMaintenanceForUpdate,
  loadScheduleForUpdate,
  updateAssetStatus,
  updateMaintenance,
  updateMaintenanceSchedule,
  updateScheduleAfterCompletion,
};
