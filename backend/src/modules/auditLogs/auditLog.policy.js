const { canViewAuditLogs } = require('../../utils/authorization');

function canAccessAuditLogs(user) {
  return canViewAuditLogs(user);
}

module.exports = {
  canAccessAuditLogs,
};
