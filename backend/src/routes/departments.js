const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { canManageDepartments, canViewDepartment, canViewAllOperationalData } = require('../utils/authorization');
const { logAction } = require('../utils/audit');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const params = [];
    let where = '';
    if (!canViewAllOperationalData(req.user)) {
      params.push(req.user.department_id || -1);
      where = `WHERE d.department_id = $${params.length}`;
    }

    const result = await pool.query(`
      SELECT d.*,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.department_id) AS staff_count,
        (SELECT COUNT(*) FROM assets a WHERE a.department_id = d.department_id) AS asset_count,
        (SELECT COUNT(*) FROM service_requests sr WHERE sr.department_id = d.department_id) AS request_count
      FROM departments d
      ${where}
      ORDER BY d.name
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load departments.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  if (!canViewDepartment(req.user, req.params.id)) {
    return res.status(403).json({ error: 'You do not have permission to view this department.' });
  }

  try {
    const dept = await pool.query('SELECT * FROM departments WHERE department_id = $1', [req.params.id]);
    if (dept.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found.' });
    }
    const [staff, assets, requests] = await Promise.all([
      pool.query('SELECT user_id, full_name, role FROM users WHERE department_id = $1 ORDER BY full_name', [req.params.id]),
      pool.query('SELECT asset_id, asset_tag, asset_type, status FROM assets WHERE department_id = $1 ORDER BY asset_tag', [req.params.id]),
      pool.query('SELECT request_id, subject, status, priority, date_submitted FROM service_requests WHERE department_id = $1 ORDER BY date_submitted DESC', [req.params.id]),
    ]);
    res.json({ ...dept.rows[0], staff: staff.rows, assets: assets.rows, service_requests: requests.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load department.' });
  }
});

router.post(
  '/',
  requireAuth,
  [body('name').trim().notEmpty().withMessage('Department name is required')],
  async (req, res) => {
    if (!canManageDepartments(req.user)) {
      return res.status(403).json({ error: 'Only administrators may create departments.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    const { name, description } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO departments (name, description) VALUES ($1,$2) RETURNING *',
        [name, description || null]
      );
      await logAction(req.user.user_id, 'Department added', 'department', result.rows[0].department_id, `Added department ${name}`);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'A department with that name already exists.' });
      }
      res.status(500).json({ error: 'Failed to create department.' });
    }
  }
);

router.put('/:id', requireAuth, async (req, res) => {
  if (!canManageDepartments(req.user)) {
    return res.status(403).json({ error: 'Only administrators may update departments.' });
  }

  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE departments SET name = COALESCE($1, name), description = $2 WHERE department_id = $3 RETURNING *',
      [name, description || null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Department not found.' });
    }
    await logAction(req.user.user_id, 'Department edited', 'department', req.params.id, `Updated department ${result.rows[0].name}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update department.' });
  }
});

module.exports = router;
