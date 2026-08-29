const pool = require('../../config/db');
const mapper = require('./notification.mapper');
const policy = require('./notification.policy');
const repository = require('./notification.repository');
const {
  NOTIFICATION_EVENT_TYPES,
} = require('./notification.constants');

function getNotificationEventConfig(eventType) {
  return NOTIFICATION_EVENT_TYPES[eventType] || NOTIFICATION_EVENT_TYPES.system;
}

async function emitNotificationEvent(event, executor = pool) {
  const eventConfig = getNotificationEventConfig(event.type);
  const rows = await repository.loadNotificationTargets(executor, event.recipient_user_ids || []);
  const targets = rows.map(mapper.mapDeliveryTargetRow);
  const created = [];

  for (const target of targets) {
    const allowInApp = policy.shouldDeliverForChannel(eventConfig, target.preferences, 'in_app');
    const allowEmail = policy.shouldDeliverForChannel(eventConfig, target.preferences, 'email');

    if (!allowInApp && !allowEmail) {
      continue;
    }

    let notificationRow = null;
    if (allowInApp) {
      notificationRow = await repository.insertNotification(executor, target, event, eventConfig);
      if (notificationRow) {
        created.push(mapper.mapNotificationRow(notificationRow));
      }
    }

    if (allowEmail && target.email) {
      await repository.insertEmailDelivery(executor, notificationRow, target, event);
    }
  }

  return created;
}

async function listUserNotifications(userId, options = {}, executor = pool) {
  const rows = await repository.listUserNotifications(userId, options, executor);
  return rows.map(mapper.mapNotificationRow);
}

async function countUnreadNotifications(userId, executor = pool) {
  return repository.countUnreadNotifications(userId, executor);
}

async function markNotificationRead(userId, notificationId, executor = pool) {
  const row = await repository.markNotificationRead(userId, notificationId, executor);
  return mapper.mapNotificationRow(row);
}

async function markAllNotificationsRead(userId, executor = pool) {
  return repository.markAllNotificationsRead(userId, executor);
}

async function getNotificationPreferences(userId, executor = pool) {
  const row = await repository.getNotificationPreferences(userId, executor);
  return mapper.mapPreferenceRow(row);
}

async function updateNotificationPreferences(userId, updates, executor = pool) {
  const row = await repository.updateNotificationPreferences(userId, updates, executor);
  return mapper.mapPreferenceRow(row);
}

module.exports = {
  NOTIFICATION_EVENT_TYPES,
  countUnreadNotifications,
  emitNotificationEvent,
  getNotificationEventConfig,
  getNotificationPreferences,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  shouldDeliverForChannel: policy.shouldDeliverForChannel,
  updateNotificationPreferences,
};
