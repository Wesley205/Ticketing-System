const service = require('./auditLog.service');
const { AUDIT_LOG_ERROR_MESSAGES } = require('./auditLog.constants');

async function list(req, res) {
  try {
    const rows = await service.listAuditLogs(req.query);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: AUDIT_LOG_ERROR_MESSAGES.listFailed });
  }
}

module.exports = {
  list,
};
