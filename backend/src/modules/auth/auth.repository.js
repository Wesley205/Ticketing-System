const { USER_SELECT_COLUMNS } = require("./auth.constants");

async function findUserForAuthentication(executor, identifier) {
  const result = await executor.query(
    `SELECT ${USER_SELECT_COLUMNS}
     FROM users
     WHERE LOWER(email) = $1 OR LOWER(username) = $1`,
    [identifier],
  );

  return result.rows[0] || null;
}

async function findUserForSession(executor, userId) {
  const result = await executor.query(
    `SELECT ${USER_SELECT_COLUMNS}
     FROM users
     WHERE user_id = $1`,
    [userId],
  );

  return result.rows[0] || null;
}

async function deactivateExpiredAccount(executor, userId) {
  await executor.query(
    `UPDATE users
     SET is_active = FALSE,
         account_status = 'deactivated',
         deactivated_at = COALESCE(deactivated_at, NOW()),
         deactivation_reason = COALESCE(deactivation_reason, 'Temporary account expired')
     WHERE user_id = $1`,
    [userId],
  );
}

async function findActiveUserForPasswordReset(executor, email) {
  const result = await executor.query(
    `SELECT user_id, full_name, email, is_active, COALESCE(account_status, 'active') AS account_status
     FROM users
     WHERE LOWER(email) = $1`,
    [email],
  );

  const user = result.rows[0] || null;
  if (!user || !user.is_active || user.account_status !== "active") {
    return null;
  }
  return user;
}

async function createPasswordResetToken(executor, userId, tokenHash, expiresInMinutes) {
  await executor.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3::text || ' minutes')::INTERVAL)`,
    [userId, tokenHash, String(expiresInMinutes)],
  );
}

async function findUsablePasswordResetToken(executor, tokenHash) {
  const result = await executor.query(
    `SELECT prt.password_reset_token_id, prt.user_id, u.full_name
     FROM password_reset_tokens prt
     JOIN users u ON u.user_id = prt.user_id
     WHERE prt.token_hash = $1
       AND prt.used_at IS NULL
       AND prt.expires_at > NOW()
       AND u.is_active = TRUE
       AND COALESCE(u.account_status, 'active') = 'active'
     FOR UPDATE`,
    [tokenHash],
  );

  return result.rows[0] || null;
}

async function updatePasswordFromReset(executor, userId, passwordHash) {
  await executor.query(
    `UPDATE users
     SET password_hash = $2,
         password_changed_at = NOW(),
         session_version = session_version + 1,
         failed_login_attempts = 0,
         locked_until = NULL
     WHERE user_id = $1`,
    [userId, passwordHash],
  );
}

async function markPasswordResetTokenUsed(executor, passwordResetTokenId) {
  await executor.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW(),
         updated_at = NOW()
     WHERE password_reset_token_id = $1 AND used_at IS NULL`,
    [passwordResetTokenId],
  );
}

async function incrementSessionVersion(executor, userId) {
  await executor.query(
    `UPDATE users
     SET session_version = session_version + 1
     WHERE user_id = $1`,
    [userId],
  );
}

module.exports = {
  createPasswordResetToken,
  deactivateExpiredAccount,
  findActiveUserForPasswordReset,
  findUsablePasswordResetToken,
  findUserForAuthentication,
  findUserForSession,
  incrementSessionVersion,
  markPasswordResetTokenUsed,
  updatePasswordFromReset,
};
