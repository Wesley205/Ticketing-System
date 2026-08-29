const GENERIC_INVALID_CREDENTIALS = "Invalid credentials.";
const DEFAULT_JWT_EXPIRES_IN = "8h";
const DEFAULT_PASSWORD_RESET_TOKEN_BYTES = 32;
const DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES = 30;

const USER_SELECT_COLUMNS = `
  user_id, full_name, email, username, password_hash, role, user_type, department_id, phone,
  is_active, COALESCE(account_status, 'active') AS account_status, account_start_date,
  account_expiration_date, sponsor_name, supervisor_user_id, session_version, created_at,
  last_login_at
`;

module.exports = {
  DEFAULT_JWT_EXPIRES_IN,
  DEFAULT_PASSWORD_RESET_EXPIRES_MINUTES,
  DEFAULT_PASSWORD_RESET_TOKEN_BYTES,
  GENERIC_INVALID_CREDENTIALS,
  USER_SELECT_COLUMNS,
};
