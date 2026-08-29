const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/authorize');
const controller = require('./auditLog.controller');
const policy = require('./auditLog.policy');
const validator = require('./auditLog.validator');
const { AUDIT_LOG_ERROR_MESSAGES } = require('./auditLog.constants');

const router = express.Router();
const requireAuditLogAccess = requirePermission(policy.canAccessAuditLogs, AUDIT_LOG_ERROR_MESSAGES.forbidden);

router.get('/', requireAuth, requireAuditLogAccess, validator.list, controller.list);

module.exports = router;
