const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  canManageAssets,
  canUpdateAssetStatus,
  canViewAsset,
  constrainAssetVisibility,
} = require('../utils/authorization');
const {
  assignAssetRecord,
  updateAssetStatusRecord,
} = require('../services/assets');
const { logAction } = require('../utils/audit');

const router = express.Router();

const ASSET_SELECT = `
  SELECT a.*, d.name AS department_name, u.full_name AS assigned_staff_name
  FROM assets a
  LEFT JOIN departments d ON d.department_id = a.department_id
  LEFT JOIN users u ON u.user_id = a.assigned_to
`;

async function getAssetById(id) {
  const result = await pool.query(`${ASSET_SELECT} WHERE a.asset_id = $1`, [id]);
  return result.rows[0] || null;
}

router.get('/', requireAuth, async (req, res) => {
  const { search, status, asset_type, department_id } = req.query;
  const clauses = [];
  const params = [];

  constrainAssetVisibility(req.user, { clauses, params, alias: 'a' });

  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(a.asset_tag ILIKE $${params.length} OR a.brand ILIKE $${params.length} OR a.model ILIKE $${params.length} OR a.serial_number ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    clauses.push(`a.status = $${params.length}`);
  }
  if (asset_type) {
    params.push(asset_type);
    clauses.push(`a.asset_type = $${params.length}`);
  }
  if (department_id) {
    params.push(department_id);
    clauses.push(`a.department_id = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const result = await pool.query(`${ASSET_SELECT} ${where} ORDER BY a.asset_id DESC`, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load assets.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await getAssetById(req.params.id);
    if (!asset) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    if (!canViewAsset(req.user, asset)) {
      return res.status(403).json({ error: 'You do not have permission to view this asset.' });
    }

    const historyResult = await pool.query(
      `SELECT m.*, u.full_name AS technician_name
       FROM maintenance m
       LEFT JOIN users u ON u.user_id = m.technician_id
       WHERE m.asset_id = $1
       ORDER BY m.maintenance_date DESC`,
      [req.params.id]
    );
    res.json({ ...asset, maintenance_history: historyResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load asset.' });
  }
});

router.post(
  '/',
  requireAuth,
  [
    body('asset_tag').trim().notEmpty().withMessage('Asset tag is required'),
    body('asset_type').notEmpty().withMessage('Asset type is required'),
  ],
  async (req, res) => {
    if (!canManageAssets(req.user)) {
      return res.status(403).json({ error: 'You do not have permission to create assets.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const {
      asset_tag, asset_type, brand, model, serial_number, department_id,
      assigned_to, purchase_date, condition, status, location, description,
    } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO assets
          (asset_tag, asset_type, brand, model, serial_number, department_id,
           assigned_to, purchase_date, condition, status, location, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [asset_tag, asset_type, brand || null, model || null, serial_number || null,
         department_id || null, assigned_to || null, purchase_date || null,
         condition || 'Good', status || 'Available', location || null, description || null]
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Asset tag or serial number already exists.' });
      }
      res.status(500).json({ error: 'Failed to create asset.' });
    }
  }
);

router.put('/:id', requireAuth, async (req, res) => {
  if (!canManageAssets(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to update assets.' });
  }

  const {
    asset_tag, asset_type, brand, model, serial_number, department_id,
    assigned_to, purchase_date, condition, status, location, description,
  } = req.body;

  try {
    const result = await pool.query(
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
        status = COALESCE($10, status),
        location = $11,
        description = $12
       WHERE asset_id = $13
       RETURNING *`,
      [asset_tag, asset_type, brand || null, model || null, serial_number || null,
       department_id || null, assigned_to || null, purchase_date || null,
       condition, status, location || null, description || null, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    await logAction(req.user.user_id, 'Asset edited', 'asset', req.params.id, `Updated asset ${result.rows[0].asset_tag}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update asset.' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Active', 'Available', 'Assigned', 'Under Maintenance', 'Damaged', 'Retired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }
  try {
    const existing = await getAssetById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    if (!canUpdateAssetStatus(req.user, existing)) {
      return res.status(403).json({ error: 'You do not have permission to change this asset status.' });
    }

    const result = await updateAssetStatusRecord(req.params.id, status, req.user.user_id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change asset status.' });
  }
});

router.patch('/:id/assign', requireAuth, async (req, res) => {
  if (!canManageAssets(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to assign assets.' });
  }

  const { assigned_to } = req.body;
  try {
    const result = await assignAssetRecord(req.params.id, assigned_to || null, req.user.user_id);
    if (!result) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign asset.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (!canManageAssets(req.user) || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only administrators may delete assets.' });
  }

  try {
    const result = await pool.query('DELETE FROM assets WHERE asset_id = $1 RETURNING asset_tag', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    await logAction(req.user.user_id, 'Asset deleted', 'asset', req.params.id, `Deleted asset ${result.rows[0].asset_tag}`);
    res.json({ message: 'Asset deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete asset.' });
  }
});

module.exports = router;
