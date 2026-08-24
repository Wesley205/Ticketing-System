const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { validateManagedUser } = require('../config/authPolicy');
const { canManageUsers, canViewTechnicianDirectory, canViewAllOperationalData } = require('../utils/authorization');
const { logAction } = require('../utils/audit');

const router = express.Router();
const SALT_ROUNDS = 10;

const STAFF_SELECT = `
  SELECT u.user_id, u.full_name, u.email, u.username, u.role, u.user_type, u.phone,
         u.is_active, u.created_at, u.last_login_at, u.department_id, d.name AS department_name,
         u.sponsor_name, u.account_start_date, u.account_expiration_date, u.deactivated_at,
         u.deactivation_reason
  FROM users u
  LEFT JOIN departments d ON d.department_id = u.department_id
`;

router.get('/', requireAuth, async (req, res) => {
  if (!canViewAllOperationalData(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to view staff records.' });
  }

  const { search, role, user_type, department_id } = req.query;
  const clauses = [];
  const params = [];
  if (search) {
    params.push(`%${search}%`);
    clauses.push(`(u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.username ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    clauses.push(`u.role = $${params.length}`);
  }
  if (user_type) {
    params.push(user_type);
    clauses.push(`u.user_type = $${params.length}`);
  }
  if (department_id) {
    params.push(department_id);
    clauses.push(`u.department_id = $${params.length}`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const result = await pool.query(`${STAFF_SELECT} ${where} ORDER BY u.full_name`, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load staff.' });
  }
});

router.get('/technicians', requireAuth, async (req, res) => {
  if (!canViewTechnicianDirectory(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to view the technician directory.' });
  }

  try {
    const result = await pool.query(
      "SELECT user_id, full_name FROM users WHERE role = 'technician' AND is_active = TRUE ORDER BY full_name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load technicians.' });
  }
});

router.post(
  '/',
  requireAuth,
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['admin', 'ict_officer', 'technician', 'staff']).withMessage('Invalid role'),
    body('user_type').optional().isIn(['employee', 'intern', 'corper', 'contractor', 'guest']).withMessage('Invalid user type'),
  ],
  async (req, res) => {
    if (!canManageUsers(req.user)) {
      return res.status(403).json({ error: 'Only administrators may create accounts directly.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const validationError = validateManagedUser(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const {
      full_name,
      email,
      username,
      password,
      role,
      user_type,
      department_id,
      phone,
      sponsor_name,
      supervisor_user_id,
      account_start_date,
      account_expiration_date,
    } = req.body;

    try {
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = await pool.query(
        `INSERT INTO users
          (full_name, email, username, password_hash, role, user_type, department_id, phone,
           sponsor_name, supervisor_user_id, account_start_date, account_expiration_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, CURRENT_DATE),$12)
         RETURNING user_id, full_name, email, username, role, user_type, department_id, phone,
                   sponsor_name, account_start_date, account_expiration_date, is_active`,
        [
          full_name,
          email.trim().toLowerCase(),
          username.trim(),
          passwordHash,
          role,
          user_type || 'employee',
          department_id || null,
          phone || null,
          sponsor_name || null,
          supervisor_user_id || null,
          account_start_date || null,
          account_expiration_date || null,
        ]
      );
      await logAction(req.user.user_id, 'Staff record modified', 'user', result.rows[0].user_id, `Created ${role} account for ${full_name}`);
      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Email or username already in use.' });
      }
      res.status(500).json({ error: 'Failed to create staff account.' });
    }
  }
);

router.put('/:id', requireAuth, async (req, res) => {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ error: 'Only administrators may update staff accounts.' });
  }

  const validationError = validateManagedUser(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const {
    full_name,
    email,
    role,
    user_type,
    department_id,
    phone,
    sponsor_name,
    supervisor_user_id,
    account_start_date,
    account_expiration_date,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        email = COALESCE($2, email),
        role = COALESCE($3, role),
        user_type = COALESCE($4, user_type),
        department_id = $5,
        phone = $6,
        sponsor_name = $7,
        supervisor_user_id = $8,
        account_start_date = COALESCE($9, account_start_date),
        account_expiration_date = $10
       WHERE user_id = $11
       RETURNING user_id, full_name, email, username, role, user_type, department_id, phone,
                 sponsor_name, account_start_date, account_expiration_date, is_active`,
      [
        full_name,
        email ? email.trim().toLowerCase() : null,
        role,
        user_type,
        department_id || null,
        phone || null,
        sponsor_name || null,
        supervisor_user_id || null,
        account_start_date || null,
        account_expiration_date || null,
        req.params.id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }
    await logAction(req.user.user_id, 'Staff record modified', 'user', req.params.id, `Updated profile for ${result.rows[0].full_name}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already in use.' });
    }
    res.status(500).json({ error: 'Failed to update staff member.' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ error: 'Only administrators may change account status.' });
  }

  const { is_active, deactivation_reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE users
       SET is_active = $1,
           deactivated_at = CASE WHEN $1 THEN NULL ELSE NOW() END,
           deactivation_reason = CASE WHEN $1 THEN NULL ELSE $2 END
       WHERE user_id = $3
       RETURNING user_id, full_name, is_active, deactivation_reason`,
      [!!is_active, deactivation_reason || 'Account deactivated by administrator', req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }
    await logAction(
      req.user.user_id,
      'Staff record modified',
      'user',
      req.params.id,
      `${is_active ? 'Activated' : 'Deactivated'} account for ${result.rows[0].full_name}`
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change account status.' });
  }
});

router.patch('/:id/extend', requireAuth, async (req, res) => {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ error: 'Only administrators may extend temporary accounts.' });
  }

  const { account_expiration_date } = req.body;
  if (!account_expiration_date) {
    return res.status(400).json({ error: 'A new account expiration date is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE users
       SET account_expiration_date = $1,
           is_active = TRUE,
           deactivated_at = NULL,
           deactivation_reason = NULL
       WHERE user_id = $2
       RETURNING user_id, full_name, account_expiration_date, is_active`,
      [account_expiration_date, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }
    await logAction(req.user.user_id, 'Temporary account extended', 'user', req.params.id, `Extended account for ${result.rows[0].full_name} to ${account_expiration_date}`);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to extend temporary account.' });
  }
});

module.exports = router;
