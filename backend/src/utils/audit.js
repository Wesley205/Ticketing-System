function getDefaultExecutor() {
  return require('../config/db');
}

async function logAction(userId, action, recordType, recordId, details, executor = getDefaultExecutor()) {
  try {
    await executor.query(
      `INSERT INTO audit_logs (user_id, action, record_type, record_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, action, recordType || null, recordId || null, details || null]
    );
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
