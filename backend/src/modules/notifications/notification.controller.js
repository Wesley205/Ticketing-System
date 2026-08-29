const service = require('./notification.service');
const { NOTIFICATION_ERROR_MESSAGES } = require('./notification.constants');

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

module.exports = {
  getPreferences,
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
  updatePreferences,
};
