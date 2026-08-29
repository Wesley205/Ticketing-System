const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/authorize');
const controller = require('./department.controller');
const policy = require('./department.policy');
const validator = require('./department.validator');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requirePermission(policy.canListDepartments, 'Authentication required.'),
  controller.listDepartments
);

router.get(
  '/:id',
  requireAuth,
  validator.departmentIdParam,
  controller.getDepartmentDetails
);

router.post(
  '/',
  requireAuth,
  requirePermission(policy.canCreateDepartment, 'Only administrators may create departments.'),
  validator.createDepartment,
  controller.createDepartment
);

router.put(
  '/:id',
  requireAuth,
  requirePermission(policy.canUpdateDepartment, 'Only administrators may update departments.'),
  validator.updateDepartment,
  controller.updateDepartment
);

module.exports = router;
