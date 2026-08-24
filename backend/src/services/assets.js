const { withTransaction } = require('../utils/transactions');
const { logAction } = require('../utils/audit');

async function assignAssetRecord(assetId, assignedTo, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT asset_id, asset_tag, department_id, assigned_to FROM assets WHERE asset_id = $1 FOR UPDATE',
      [assetId]
    );
    if (existing.rows.length === 0) return null;

    await client.query(
      `UPDATE asset_assignments
       SET is_active = FALSE,
           returned_at = NOW(),
           return_notes = COALESCE(return_notes, 'Closed automatically due to reassignment')
       WHERE asset_id = $1 AND is_active = TRUE`,
      [assetId]
    );

    const updated = await client.query(
      `UPDATE assets
       SET assigned_to = $1,
           status = CASE WHEN $1 IS NULL THEN 'Available' ELSE 'Assigned' END
       WHERE asset_id = $2
       RETURNING *`,
      [assignedTo || null, assetId]
    );

    if (assignedTo) {
      await client.query(
        `INSERT INTO asset_assignments (
           asset_id, assigned_user_id, assigned_department_id, assigned_by_user_id, assignment_notes, is_active
         ) VALUES ($1,$2,$3,$4,$5,TRUE)`,
        [
          assetId,
          assignedTo,
          existing.rows[0].department_id,
          actorUserId,
          'Recorded during asset assignment operation',
        ]
      );
    }

    await logAction(actorUserId, 'Asset assigned', 'asset', assetId, `Reassigned asset (user_id: ${assignedTo || 'none'})`, client);
    return updated.rows[0];
  });
}

async function updateAssetStatusRecord(assetId, status, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT asset_id FROM assets WHERE asset_id = $1 FOR UPDATE',
      [assetId]
    );
    if (existing.rows.length === 0) return null;

    const updated = await client.query(
      'UPDATE assets SET status = $1 WHERE asset_id = $2 RETURNING *',
      [status, assetId]
    );

    await logAction(actorUserId, 'Asset status changed', 'asset', assetId, `Status changed to ${status}`, client);
    return updated.rows[0];
  });
}

module.exports = {
  assignAssetRecord,
  updateAssetStatusRecord,
};
