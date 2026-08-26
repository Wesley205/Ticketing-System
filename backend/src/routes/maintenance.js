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
  MAINTENANCE_SCHEDULE_TYPES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  createMaintenanceRecord,
  createMaintenanceScheduleRecord,
  listMaintenanceSchedules,
  updateMaintenanceScheduleRecord,
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

async function getScheduleById(id) {
  const result = await pool.query(
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

router.get('/schedules', requireAuth, async (req, res) => {
  const { asset_id, is_active } = req.query;
  try {
    const schedules = await listMaintenanceSchedules(pool, {
      asset_id: asset_id || null,
      is_active: is_active === undefined ? undefined : is_active === 'true',
    });
    const filtered = schedules.filter((schedule) => canCreateMaintenance(req.user, schedule));
    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load maintenance schedules.' });
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
    const {
      asset_id,
      technician_id,
      problem,
      action_taken,
      maintenance_date,
      cost,
      status,
      notes,
      maintenance_type,
      related_request_id,
      schedule_id,
      scheduled_start_at,
      next_due_at,
      checklist_items,
      completion_notes,
    } = req.body;
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
        maintenance_type: maintenance_type || 'Corrective',
        related_request_id: related_request_id || null,
        schedule_id: schedule_id || null,
        assigned_by_user_id: req.user.user_id,
        scheduled_start_at: scheduled_start_at || null,
        next_due_at: next_due_at || null,
        checklist_items: Array.isArray(checklist_items) ? checklist_items : [],
        completion_notes: completion_notes || null,
      });
      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create maintenance record.' });
    }
  }
);

router.put('/:id', requireAuth, async (req, res) => {
  const {
    action_taken,
    cost,
    status,
    notes,
    technician_id,
    scheduled_start_at,
    next_due_at,
    checklist_items,
    completion_notes,
    asset_status_override,
  } = req.body;
  try {
    const existing = await getMaintenanceById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Maintenance record not found.' });
    }
    if (!canUpdateMaintenance(req.user, existing)) {
      return res.status(403).json({ error: 'You do not have permission to update this maintenance record.' });
    }

    if (status && !MAINTENANCE_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid maintenance status.' });
    }

    const result = await updateMaintenanceRecord(req.params.id, {
      action_taken,
      cost,
      status,
      notes,
      technician_id: technician_id || null,
      scheduled_start_at: scheduled_start_at || null,
      next_due_at: next_due_at || null,
      checklist_items: Array.isArray(checklist_items) ? checklist_items : undefined,
      completion_notes: completion_notes || null,
      asset_status_override: asset_status_override || null,
    }, req.user.user_id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update maintenance record.' });
  }
});

router.post(
  '/schedules',
  requireAuth,
  [
    body('asset_id').isInt().withMessage('A valid asset is required'),
    body('title').trim().notEmpty().withMessage('A schedule title is required'),
    body('maintenance_type').optional().isIn(MAINTENANCE_SCHEDULE_TYPES).withMessage('Invalid schedule type'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    try {
      const asset = await getAssetById(req.body.asset_id);
      if (!asset) {
        return res.status(404).json({ error: 'Asset not found.' });
      }
      if (!canCreateMaintenance(req.user, asset)) {
        return res.status(403).json({ error: 'You do not have permission to schedule maintenance for this asset.' });
      }

      const result = await createMaintenanceScheduleRecord({
        ...req.body,
        actor_user_id: req.user.user_id,
        assigned_by_user_id: req.user.user_id,
      });
      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: err.message || 'Failed to create maintenance schedule.' });
    }
  }
);

router.put('/schedules/:id', requireAuth, async (req, res) => {
  try {
    const existing = await getScheduleById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Maintenance schedule not found.' });
    }
    if (!canUpdateMaintenance(req.user, existing) && !canCreateMaintenance(req.user, existing)) {
      return res.status(403).json({ error: 'You do not have permission to update this maintenance schedule.' });
    }

    const result = await updateMaintenanceScheduleRecord(req.params.id, req.body, req.user.user_id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message || 'Failed to update maintenance schedule.' });
  }
});

module.exports = router;
