const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { canViewAuditLogs } = require('../utils/authorization');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  if (!canViewAuditLogs(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to view audit logs.' });
  }

  const { user_id, action, from, to, limit } = req.query;
  const clauses = [];
  const params = [];

  if (user_id) {
    params.push(user_id);
    clauses.push(`al.user_id = $${params.length}`);
  }
  if (action) {
    params.push(`%${action}%`);
    clauses.push(`al.action ILIKE $${params.length}`);
  }
  if (from) {
    params.push(from);
    clauses.push(`al.created_at >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    clauses.push(`al.created_at <= $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const lim = Math.min(parseInt(limit, 10) || 200, 1000);

  try {
    const result = await pool.query(
      `SELECT al.log_id, al.action, al.record_type, al.record_id, al.details, al.created_at,
              u.full_name AS user_name, u.role AS user_role
       FROM audit_logs al
       LEFT JOIN users u ON u.user_id = al.user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT ${lim}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load audit logs.' });
  }
});

module.exports = router;
