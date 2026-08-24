const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  canCreateMaintenance,
  canUpdateMaintenance,
  constrainMaintenanceVisibility,
} = require('../utils/authorization');
const {
  createMaintenanceRecord,
  updateMaintenanceRecord,
} = require('../services/maintenance');

const router = express.Router();

const M_SELECT = `
  SELECT m.*, a.asset_tag, a.asset_type, a.department_id, u.full_name AS technician_name
  FROM maintenance m
  JOIN assets a ON a.asset_id = m.asset_id
  LEFT JOIN users u ON u.user_id = m.technician_id
`;

async function getAssetById(assetId) {
  const result = await pool.query(
    'SELECT asset_id, department_id, assigned_to, status FROM assets WHERE asset_id = $1',
    [assetId]
  );
  return result.rows[0] || null;
}

async function getMaintenanceById(id) {
  const result = await pool.query(`${M_SELECT} WHERE m.maintenance_id = $1`, [id]);
  return result.rows[0] || null;
}

router.get('/', requireAuth, async (req, res) => {
  const { asset_id, status } = req.query;
  const clauses = [];
  const params = [];
  constrainMaintenanceVisibility(req.user, { clauses, params, maintenanceAlias: 'm', assetAlias: 'a' });
  if (asset_id) {
    params.push(asset_id);
    clauses.push(`m.asset_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    clauses.push(`m.status = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const result = await pool.query(`${M_SELECT} ${where} ORDER BY m.maintenance_date DESC`, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load maintenance records.' });
  }
});

router.post(
  '/',
  requireAuth,
  [
    body('asset_id').isInt().withMessage('A valid asset is required'),
    body('problem').trim().notEmpty().withMessage('Problem description is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { asset_id, technician_id, problem, action_taken, maintenance_date, cost, status, notes } = req.body;
    try {
      const asset = await getAssetById(asset_id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found.' });
      }
      if (!canCreateMaintenance(req.user, asset)) {
        return res.status(403).json({ error: 'You do not have permission to create maintenance for this asset.' });
      }

      const effectiveTechnicianId = req.user.role === 'technician' ? req.user.user_id : (technician_id || req.user.user_id);
      const result = await createMaintenanceRecord({
        actor_user_id: req.user.user_id,
        asset_id,
        technician_id: effectiveTechnicianId,
        problem,
        action_taken,
        maintenance_date,
        cost,
        status,
        notes,
      });
      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create maintenance record.' });
    }
  }
);

router.put('/:id', requireAuth, async (req, res) => {
  const { action_taken, cost, status, notes } = req.body;
  try {
    const existing = await getMaintenanceById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    if (!canUpdateMaintenance(req.user, existing)) {
      return res.status(403).json({ error: 'You do not have permission to update this maintenance record.' });
    }

    const result = await updateMaintenanceRecord(req.params.id, { action_taken, cost, status, notes }, req.user.user_id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update maintenance record.' });
  }
});

module.exports = router;
