const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/authorize');
const controller = require('./invitation.controller');
const policy = require('./invitation.policy');
const validator = require('./invitation.validator');
const { INVITATION_ERROR_MESSAGES } = require('./invitation.constants');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  requirePermission(policy.canListInvitations, INVITATION_ERROR_MESSAGES.viewForbidden),
  validator.list,
  controller.list
);

router.post(
  '/',
  requireAuth,
  requirePermission(policy.canIssueInvitation, INVITATION_ERROR_MESSAGES.createForbidden),
  validator.create,
  controller.create
);

router.post('/accept', validator.accept, controller.accept);

router.post(
  '/:id/revoke',
  requireAuth,
  requirePermission(policy.canRevokeInvitation, INVITATION_ERROR_MESSAGES.revokeForbidden),
  validator.revoke,
  controller.revoke
);

router.post(
  '/:id/resend',
  requireAuth,
  requirePermission(policy.canIssueInvitation, INVITATION_ERROR_MESSAGES.createForbidden),
  validator.revoke,
  controller.resend
);

module.exports = router;
