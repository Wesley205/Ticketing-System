const ASSET_SELECT = `
  SELECT a.*, d.name AS department_name, u.full_name AS assigned_staff_name,
         f.floor_label
  FROM assets a
  LEFT JOIN departments d ON d.department_id = a.department_id
  LEFT JOIN users u ON u.user_id = a.assigned_to
  LEFT JOIN floors f ON f.floor_id = a.floor_id
`;

function buildAssetListQuery(filters = {}, visibility = { clauses: [], params: [] }) {
  const clauses = [...(visibility.clauses || [])];
  const params = [...(visibility.params || [])];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    clauses.push(`(a.asset_tag ILIKE $${params.length} OR a.brand ILIKE $${params.length} OR a.model ILIKE $${params.length} OR a.serial_number ILIKE $${params.length})`);
  }
  if (filters.status) {
    params.push(filters.status);
    clauses.push(`a.status = $${params.length}`);
  }
  if (filters.asset_type) {
    params.push(filters.asset_type);
    clauses.push(`a.asset_type = $${params.length}`);
  }
  if (filters.department_id) {
    params.push(filters.department_id);
    clauses.push(`a.department_id = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  return {
    sql: `${ASSET_SELECT} ${where} ORDER BY a.asset_id DESC`,
    params,
  };
}

async function listAssets(executor, filters, visibility) {
  const query = buildAssetListQuery(filters, visibility);
  const result = await executor.query(query.sql, query.params);
  return result.rows;
}

async function getAssetById(executor, assetId) {
  const result = await executor.query(`${ASSET_SELECT} WHERE a.asset_id = $1`, [assetId]);
  return result.rows[0] || null;
}

async function insertAsset(client, data) {
  const result = await client.query(
    `INSERT INTO assets
      (asset_tag, asset_type, brand, model, serial_number, department_id,
       floor_id, assigned_to, purchase_date, condition, status, location, description)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      data.asset_tag,
      data.asset_type,
      data.brand || null,
      data.model || null,
      data.serial_number || null,
      data.department_id || null,
      data.floor_id || null,
      null,
      data.purchase_date || null,
      data.condition || 'Good',
      'Available',
      data.location || null,
      data.description || null,
    ]
  );
  return result.rows[0] || null;
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

async function updateAsset(client, assetId, updates) {
  const result = await client.query(
    `UPDATE assets SET
      asset_tag = COALESCE($1, asset_tag),
      asset_type = COALESCE($2, asset_type),
      brand = $3,
      model = $4,
      serial_number = $5,
      department_id = $6,
      floor_id = $7,
      assigned_to = $8,
      purchase_date = $9,
      condition = COALESCE($10, condition),
      status = $11,
      location = $12,
      description = $13
     WHERE asset_id = $14
     RETURNING *`,
    [
      updates.asset_tag,
      updates.asset_type,
      updates.brand || null,
      updates.model || null,
      updates.serial_number || null,
      updates.department_id || null,
      updates.floor_id || null,
      updates.assigned_to,
      updates.purchase_date || null,
      updates.condition || null,
      updates.status,
      updates.location || null,
      updates.description || null,
      assetId,
    ]
  );
  return result.rows[0] || null;
}

async function updateAssetAssignment(client, assetId, assignedTo, status) {
  const result = await client.query(
    `UPDATE assets
     SET assigned_to = $1,
         status = $2
     WHERE asset_id = $3
     RETURNING *`,
    [assignedTo, status, assetId]
  );
  return result.rows[0] || null;
}

async function updateAssetReturn(client, assetId, returnedCondition, status) {
  const result = await client.query(
    `UPDATE assets
     SET assigned_to = NULL,
         condition = COALESCE($1, condition),
         status = $2
     WHERE asset_id = $3
     RETURNING *`,
    [returnedCondition || null, status, assetId]
  );
  return result.rows[0] || null;
}

async function updateAssetStatus(client, assetId, status) {
  const result = await client.query(
    'UPDATE assets SET status = $1 WHERE asset_id = $2 RETURNING *',
    [status, assetId]
  );
  return result.rows[0] || null;
}

async function deleteAsset(client, assetId) {
  const result = await client.query(
    'DELETE FROM assets WHERE asset_id = $1 RETURNING asset_tag',
    [assetId]
  );
  return result.rows[0] || null;
}

async function findUserState(executor, userId) {
  const result = await executor.query(
    'SELECT user_id, is_active FROM users WHERE user_id = $1',
    [userId]
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

async function listMaintenanceHistory(executor, assetId) {
  const result = await executor.query(
    `SELECT m.*, u.full_name AS technician_name
     FROM maintenance m
     LEFT JOIN users u ON u.user_id = m.technician_id
     WHERE m.asset_id = $1
     ORDER BY m.maintenance_date DESC`,
    [assetId]
  );
  return result.rows;
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
  buildAssetListQuery,
  closeActiveAssignment,
  deleteAsset,
  findUserState,
  getAssetById,
  insertAsset,
  insertAssetStatusHistory,
  insertAssignment,
  listAssetAssignmentHistory,
  listAssetStatusHistory,
  listAssets,
  listLinkedTickets,
  listMaintenanceHistory,
  loadAssetForUpdate,
  updateAsset,
  updateAssetAssignment,
  updateAssetReturn,
  updateAssetStatus,
};
