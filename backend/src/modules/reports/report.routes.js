const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/authorize');
const controller = require('./report.controller');
const policy = require('./report.policy');
const validator = require('./report.validator');
const { REPORT_ERROR_MESSAGES } = require('./report.constants');

const router = express.Router();
const requireReportAccess = requirePermission(policy.canAccessReports, REPORT_ERROR_MESSAGES.forbidden);

router.get('/filters', requireAuth, requireReportAccess, controller.filters);
router.get('/summary', requireAuth, requireReportAccess, validator.summary, controller.summary);
router.get('/tickets', requireAuth, requireReportAccess, validator.paginatedRows, controller.tickets);
router.get('/assets', requireAuth, requireReportAccess, validator.paginatedRows, controller.assets);
router.get('/maintenance', requireAuth, requireReportAccess, validator.paginatedRows, controller.maintenance);
router.get('/export/assets.csv', requireAuth, requireReportAccess, validator.exportCsv, controller.exportAssetsCsv);
router.get('/export/service-requests.csv', requireAuth, requireReportAccess, validator.exportCsv, controller.exportServiceRequestsCsv);

module.exports = router;
