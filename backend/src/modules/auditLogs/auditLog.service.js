const pool = require('../../config/db');
const mapper = require('./auditLog.mapper');
const repository = require('./auditLog.repository');
const {
  DEFAULT_AUDIT_LOG_LIMIT,
  MAX_AUDIT_LOG_LIMIT,
} = require('./auditLog.constants');

function parsePositiveInt(value, fallback = null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseAuditLogFilters(query = {}) {
  return {
    user_id: parsePositiveInt(query.user_id),
    action: query.action ? String(query.action) : null,
    from: query.from || null,
    to: query.to || null,
    limit: Math.min(parsePositiveInt(query.limit, DEFAULT_AUDIT_LOG_LIMIT), MAX_AUDIT_LOG_LIMIT),
  };
}

async function listAuditLogs(rawQuery = {}, executor = pool) {
  const filters = parseAuditLogFilters(rawQuery);
  const rows = await repository.listAuditLogs(executor, filters);
  return mapper.mapAuditLogRows(rows);
}

async function logAction(userId, action, recordType, recordId, details, executor = pool) {
  try {
    await repository.insertAuditLog(executor, {
      user_id: userId,
      action,
      record_type: recordType,
      record_id: recordId,
      details,
    });
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

module.exports = {
  listAuditLogs,
  logAction,
  parseAuditLogFilters,
};
