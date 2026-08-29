const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./maintenance.controller');
const validator = require('./maintenance.validator');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  validator.listMaintenance,
  controller.listMaintenance
);

router.get(
  '/schedules',
  requireAuth,
  validator.listSchedules,
  controller.listSchedules
);

router.post(
  '/',
  requireAuth,
  validator.createMaintenance,
  controller.createMaintenance
);

router.put(
  '/:id',
  requireAuth,
  validator.updateMaintenance,
  controller.updateMaintenance
);

router.post(
  '/schedules',
  requireAuth,
  validator.createSchedule,
  controller.createSchedule
);

router.put(
  '/schedules/:id',
  requireAuth,
  validator.updateSchedule,
  controller.updateSchedule
);

module.exports = router;
