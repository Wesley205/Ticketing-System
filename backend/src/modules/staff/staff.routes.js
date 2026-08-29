const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/authorize');
const controller = require('./staff.controller');
const policy = require('./staff.policy');
const validator = require('./staff.validator');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requirePermission(policy.canListStaff, 'You do not have permission to view staff records.'),
  validator.listStaff,
  controller.listStaff
);

router.get(
  '/technicians',
  requireAuth,
  requirePermission(policy.canListTechnicians, 'You do not have permission to view the technician directory.'),
  controller.listTechnicians
);

router.post(
  '/',
  requireAuth,
  requirePermission(policy.canCreateStaffAccount, 'Only administrators may create accounts directly.'),
  validator.createStaff,
  controller.createStaff
);

router.put(
  '/:id',
  requireAuth,
  requirePermission(policy.canUpdateStaffAccount, 'Only administrators may update staff accounts.'),
  validator.updateStaff,
  controller.updateStaff
);

router.patch(
  '/:id/status',
  requireAuth,
  requirePermission(policy.canUpdateStaffStatus, 'Only administrators may change account status.'),
  validator.updateStatus,
  controller.updateStatus
);

router.patch(
  '/:id/extend',
  requireAuth,
  requirePermission(policy.canExtendTemporaryAccount, 'Only administrators may extend temporary accounts.'),
  validator.extendTemporary,
  controller.extendTemporary
);

module.exports = router;
