const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authorize');
const { canViewAuditLogs } = require('../utils/authorization');
const {
  buildAppHealth,
  buildOperationsHealth,
  buildReadiness,
} = require('../services/health');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(buildAppHealth({ requestId: req.requestId }));
});

router.get('/readiness', async (req, res, next) => {
  try {
    const payload = await buildReadiness(pool, { requestId: req.requestId });
    res.status(payload.ready ? 200 : 503).json(payload);
  } catch (err) {
    next(err);
  }
});

router.get(
  '/operations',
  requireAuth,
  requirePermission(canViewAuditLogs, 'You do not have permission to view operational health.'),
  async (req, res, next) => {
    try {
      res.json(await buildOperationsHealth(pool, { requestId: req.requestId }));
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
