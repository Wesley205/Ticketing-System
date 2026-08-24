const jwt = require('jsonwebtoken');
const pool = require('../config/db');

function currentDateIso() {
  return new Date().toISOString().slice(0, 10);
}

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      `SELECT user_id, full_name, role, user_type, department_id, is_active, account_start_date, account_expiration_date
       FROM users
       WHERE user_id = $1`,
      [payload.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Account not found. Please log in again.' });
    }

    const user = result.rows[0];
    const today = currentDateIso();

    if (!user.is_active) {
      return res.status(401).json({ error: 'This account is inactive. Please log in with an active account.' });
    }

    if (user.account_start_date && String(user.account_start_date).slice(0, 10) > today) {
      return res.status(403).json({ error: 'This account is not yet active.' });
    }

    if (user.account_expiration_date && String(user.account_expiration_date).slice(0, 10) < today) {
      return res.status(403).json({ error: 'This account has expired. Contact an administrator.' });
    }

    req.user = {
      user_id: user.user_id,
      full_name: user.full_name,
      role: user.role,
      user_type: user.user_type,
      department_id: user.department_id,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
