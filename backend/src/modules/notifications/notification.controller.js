const service = require('./notification.service');
const { NOTIFICATION_ERROR_MESSAGES } = require('./notification.constants');
const { processBrowserPushQueue } = require('../../utils/notificationProcessor');

function logAndSend(res, err, message) {
  console.error(err);
  return res.status(500).json({ error: message });
}

async function listNotifications(req, res) {
  try {
    const notifications = await service.listUserNotifications(req.user.user_id, req.query);
    res.json(notifications);
  } catch (err) {
    logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.listFailed);
  }
}

async function unreadCount(req, res) {
  try {
    const unread_count = await service.countUnreadNotifications(req.user.user_id);
    res.json({ unread_count });
  } catch (err) {
    logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.countFailed);
  }
}

async function markRead(req, res) {
  try {
    const result = await service.markNotificationRead(req.user.user_id, req.params.id);
    if (!result) {
      return res.status(404).json({ error: NOTIFICATION_ERROR_MESSAGES.notFound });
    }
    return res.json(result);
  } catch (err) {
    return logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.readFailed);
  }
}

async function markAllRead(req, res) {
  try {
    const updated = await service.markAllNotificationsRead(req.user.user_id);
    res.json({ updated });
  } catch (err) {
    logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.readAllFailed);
  }
}

async function getPreferences(req, res) {
  try {
    const preferences = await service.getNotificationPreferences(req.user.user_id);
    res.json(preferences);
  } catch (err) {
    logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.preferencesFailed);
  }
}

async function updatePreferences(req, res) {
  try {
    const preferences = await service.updateNotificationPreferences(req.user.user_id, req.body);
    res.json(preferences);
  } catch (err) {
    logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.preferencesUpdateFailed);
  }
}

function getBrowserPushPublicKey(req, res) {
  const config = service.getBrowserPushConfig();
  res.json({
    configured: config.configured,
    public_key: config.publicKey || null,
  });
}

async function saveBrowserSubscription(req, res) {
  try {
    const subscription = await service.saveBrowserSubscription(
      req.user.user_id,
      req.body.subscription || req.body,
      req.get('user-agent')
    );
    res.status(201).json(subscription);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    if (statusCode >= 500) {
      return logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.browserSubscriptionFailed);
    }
    return res.status(statusCode).json({ error: err.message });
  }
}

async function listBrowserSubscriptions(req, res) {
  try {
    const subscriptions = await service.listBrowserSubscriptions(req.user.user_id);
    res.json(subscriptions);
  } catch (err) {
    logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.browserSubscriptionListFailed);
  }
}

async function deleteBrowserSubscription(req, res) {
  try {
    const subscription = await service.deleteBrowserSubscription(req.user.user_id, req.params.id);
    if (!subscription) {
      return res.status(404).json({ error: 'Browser notification device not found.' });
    }
    return res.json(subscription);
  } catch (err) {
    return logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.browserSubscriptionDeleteFailed);
  }
}

async function sendBrowserTest(req, res) {
  try {
    const notification = await service.enqueueBrowserTestNotification(req.user);
    const processed = notification
      ? await processBrowserPushQueue(undefined, {
        notificationId: notification.notification_id,
        recipientUserId: req.user.user_id,
        limit: 5,
      })
      : 0;

    res.status(200).json({
      queued: Boolean(notification),
      dispatched: processed > 0,
      processed,
      notification,
    });
  } catch (err) {
    logAndSend(res, err, NOTIFICATION_ERROR_MESSAGES.browserTestFailed);
  }
}

module.exports = {
  deleteBrowserSubscription,
  getBrowserPushPublicKey,
  getPreferences,
  listBrowserSubscriptions,
  listNotifications,
  markAllRead,
  markRead,
  saveBrowserSubscription,
  sendBrowserTest,
  unreadCount,
  updatePreferences,
};
