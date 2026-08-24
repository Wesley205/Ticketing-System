const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const {
  canAssignServiceRequest,
  canCreateServiceRequest,
  canUpdateServiceRequest,
  canViewServiceRequest,
  constrainServiceRequestVisibility,
  isTechnician,
} = require('../utils/authorization');
const {
  assignServiceRequestRecord,
  createServiceRequestRecord,
  updateServiceRequestStatusRecord,
} = require('../services/serviceRequests');

const router = express.Router();

const SR_SELECT = `
  SELECT sr.*, req.full_name AS requester_name, d.name AS department_name,
         tech.full_name AS technician_name
  FROM service_requests sr
  LEFT JOIN users req ON req.user_id = sr.requester_id
  LEFT JOIN departments d ON d.department_id = sr.department_id
  LEFT JOIN users tech ON tech.user_id = sr.assigned_technician_id
`;

async function getRequestById(id) {
  const result = await pool.query(`${SR_SELECT} WHERE sr.request_id = $1`, [id]);
  return result.rows[0] || null;
}

router.get('/', requireAuth, async (req, res) => {
  const { status, priority, category, mine } = req.query;
  const clauses = [];
  const params = [];

  constrainServiceRequestVisibility(req.user, {
    clauses,
    params,
    alias: 'sr',
    mine: mine === 'true',
  });

  if (status) {
    params.push(status);
    clauses.push(`sr.status = $${params.length}`);
  }
  if (priority) {
    params.push(priority);
    clauses.push(`sr.priority = $${params.length}`);
  }
  if (category) {
    params.push(category);
    clauses.push(`sr.category = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const result = await pool.query(`${SR_SELECT} ${where} ORDER BY sr.date_submitted DESC`, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load service requests.' });
  }
});

router.get('/assigned-to-me', requireAuth, async (req, res) => {
  if (!isTechnician(req.user)) {
    return res.status(403).json({ error: 'Only technicians can view an assigned queue.' });
  }

  try {
    const result = await pool.query(
      `${SR_SELECT} WHERE sr.assigned_technician_id = $1 ORDER BY sr.date_submitted DESC`,
      [req.user.user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load assigned requests.' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await getRequestById(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (!canViewServiceRequest(req.user, request)) {
      return res.status(403).json({ error: 'You do not have permission to view this request.' });
    }
    res.json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load request.' });
  }
});

router.post(
  '/',
  requireAuth,
  [
    body('category').notEmpty().withMessage('Category is required'),
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { category, subject, description, priority, department_id } = req.body;

    if (!canCreateServiceRequest(req.user, department_id || req.user.department_id)) {
      return res.status(403).json({ error: 'You may only create requests for your own department.' });
    }

    try {
      const result = await createServiceRequestRecord({
        requester_id: req.user.user_id,
        department_id: department_id || req.user.department_id || null,
        category,
        subject,
        description,
        priority: priority || 'Medium',
      });
      res.status(201).json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to submit request.' });
    }
  }
);

router.patch('/:id/assign', requireAuth, async (req, res) => {
  if (!canAssignServiceRequest(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to assign service requests.' });
  }

  const { assigned_technician_id } = req.body;
  try {
    const existing = await getRequestById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const techResult = await pool.query(
      `SELECT user_id, role, is_active FROM users WHERE user_id = $1`,
      [assigned_technician_id]
    );
    if (techResult.rows.length === 0 || techResult.rows[0].role !== 'technician' || !techResult.rows[0].is_active) {
      return res.status(400).json({ error: 'Assigned technician must be an active technician account.' });
    }

    const result = await assignServiceRequestRecord(req.params.id, assigned_technician_id, req.user.user_id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to assign technician.' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  const { status, resolution } = req.body;
  const validStatuses = ['Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value.' });
  }

  try {
    const existing = await getRequestById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (!canUpdateServiceRequest(req.user, existing)) {
      return res.status(403).json({ error: 'You do not have permission to update this request.' });
    }

    const result = await updateServiceRequestStatusRecord(req.params.id, status, resolution, req.user.user_id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update request status.' });
  }
});

module.exports = router;
