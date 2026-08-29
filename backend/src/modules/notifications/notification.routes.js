const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./notification.controller');
const validator = require('./notification.validator');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  validator.listNotifications,
  controller.listNotifications
);

router.get(
  '/unread-count',
  requireAuth,
  controller.unreadCount
);

router.post(
  '/read-all',
  requireAuth,
  controller.markAllRead
);

router.get(
  '/preferences/me',
  requireAuth,
  controller.getPreferences
);

router.patch(
  '/preferences/me',
  requireAuth,
  validator.updatePreferences,
  controller.updatePreferences
);

router.post(
  '/:id/read',
  requireAuth,
  validator.markRead,
  controller.markRead
);

module.exports = router;
