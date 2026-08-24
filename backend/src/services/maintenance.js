const { withTransaction } = require('../utils/transactions');
const { logAction } = require('../utils/audit');

async function createMaintenanceRecord(data) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO maintenance (asset_id, technician_id, problem, action_taken, maintenance_date, cost, status, notes)
       VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,$7,$8)
       RETURNING *`,
      [
        data.asset_id,
        data.technician_id,
        data.problem,
        data.action_taken || null,
        data.maintenance_date || null,
        data.cost || 0,
        data.status || 'Scheduled',
        data.notes || null,
      ]
    );

    const effectiveStatus = data.status || 'Scheduled';
    if (effectiveStatus === 'Completed') {
      await client.query("UPDATE assets SET status = 'Active' WHERE asset_id = $1", [data.asset_id]);
    } else if (effectiveStatus !== 'Cancelled') {
      await client.query("UPDATE assets SET status = 'Under Maintenance' WHERE asset_id = $1", [data.asset_id]);
    }

    await logAction(data.actor_user_id, 'Maintenance record created', 'maintenance', result.rows[0].maintenance_id, `Asset ${data.asset_id}: ${data.problem}`, client);
    return result.rows[0];
  });
}

async function updateMaintenanceRecord(maintenanceId, updates, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await client.query(
      'SELECT maintenance_id, asset_id FROM maintenance WHERE maintenance_id = $1 FOR UPDATE',
      [maintenanceId]
    );
    if (existing.rows.length === 0) return null;

    const result = await client.query(
      `UPDATE maintenance SET
        action_taken = COALESCE($1, action_taken),
        cost = COALESCE($2, cost),
        status = COALESCE($3, status),
        notes = COALESCE($4, notes)
       WHERE maintenance_id = $5 RETURNING *`,
      [updates.action_taken, updates.cost, updates.status, updates.notes, maintenanceId]
    );

    if (updates.status === 'Completed') {
      await client.query("UPDATE assets SET status = 'Active' WHERE asset_id = $1", [existing.rows[0].asset_id]);
    } else if (updates.status === 'In Progress' || updates.status === 'Scheduled') {
      await client.query("UPDATE assets SET status = 'Under Maintenance' WHERE asset_id = $1", [existing.rows[0].asset_id]);
    }

    await logAction(actorUserId, 'Maintenance record updated', 'maintenance', maintenanceId, `Status: ${updates.status || 'unchanged'}`, client);
    return result.rows[0];
  });
}

module.exports = {
  createMaintenanceRecord,
  updateMaintenanceRecord,
};
