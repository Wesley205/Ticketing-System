const DEFAULT_AUDIT_LOG_LIMIT = 200;
const MAX_AUDIT_LOG_LIMIT = 1000;

const AUDIT_LOG_ERROR_MESSAGES = {
  forbidden: 'You do not have permission to view audit logs.',
  listFailed: 'Failed to load audit logs.',
};

module.exports = {
  AUDIT_LOG_ERROR_MESSAGES,
  DEFAULT_AUDIT_LOG_LIMIT,
  MAX_AUDIT_LOG_LIMIT,
};
