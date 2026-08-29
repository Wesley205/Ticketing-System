const DEFAULT_MAX_FAILED_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 12;

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getLoginProtectionConfig(env = process.env) {
  return {
    maxFailedAttempts: parsePositiveInteger(env.LOGIN_MAX_FAILED_ATTEMPTS, DEFAULT_MAX_FAILED_ATTEMPTS),
    lockoutMinutes: parsePositiveInteger(env.LOGIN_LOCKOUT_MINUTES, DEFAULT_LOCKOUT_MINUTES),
  };
}

function isAccountLocked(user, now = new Date()) {
  if (!user?.locked_until) return false;
  return new Date(user.locked_until).getTime() > now.getTime();
}

function getLockoutMessage(user) {
  if (!user?.locked_until) {
    return 'Too many failed login attempts. Try again later.';
  }

  return `Too many failed login attempts. Try again after ${new Date(user.locked_until).toLocaleString('en-GB')}.`;
}

async function recordFailedLogin(pool, userId, options = {}) {
  const { maxFailedAttempts, lockoutMinutes } = {
    ...getLoginProtectionConfig(),
    ...options,
  };

  const result = await pool.query(
    `UPDATE users
     SET failed_login_attempts = failed_login_attempts + 1,
         last_failed_login_at = NOW(),
         locked_until = CASE
           WHEN failed_login_attempts + 1 >= $2 THEN NOW() + ($3::text || ' minutes')::INTERVAL
           ELSE locked_until
         END
     WHERE user_id = $1
     RETURNING failed_login_attempts, locked_until`,
    [userId, maxFailedAttempts, lockoutMinutes]
  );

  return result.rows[0] || null;
}

async function resetLoginProtection(pool, userId) {
  await pool.query(
    `UPDATE users
     SET failed_login_attempts = 0,
         locked_until = NULL,
         last_login_at = NOW()
     WHERE user_id = $1`,
    [userId]
  );
}

async function bumpSessionVersion(pool, userId) {
  await pool.query(
    `UPDATE users
     SET session_version = session_version + 1
     WHERE user_id = $1`,
    [userId]
  );
}

function validatePasswordStrength(password) {
  const value = String(password || '');

  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return 'Password must include uppercase, lowercase, number, and symbol characters.';
  }

  return null;
}

module.exports = {
  DEFAULT_LOCKOUT_MINUTES,
  DEFAULT_MAX_FAILED_ATTEMPTS,
  MIN_PASSWORD_LENGTH,
  bumpSessionVersion,
  getLockoutMessage,
  getLoginProtectionConfig,
  isAccountLocked,
  recordFailedLogin,
  resetLoginProtection,
  validatePasswordStrength,
};
