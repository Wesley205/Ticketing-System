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

router.get(
  '/browser/vapid-public-key',
  requireAuth,
  controller.getBrowserPushPublicKey
);

router.get(
  '/browser-subscriptions/me',
  requireAuth,
  controller.listBrowserSubscriptions
);

router.post(
  '/browser-subscriptions',
  requireAuth,
  validator.saveBrowserSubscription,
  controller.saveBrowserSubscription
);

router.delete(
  '/browser-subscriptions/:id',
  requireAuth,
  validator.markRead,
  controller.deleteBrowserSubscription
);

router.post(
  '/browser/test',
  requireAuth,
  controller.sendBrowserTest
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
