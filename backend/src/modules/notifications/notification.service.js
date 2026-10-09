const pool = require('../../config/db');
const { processBrowserPushQueue } = require('../../utils/notificationProcessor');
const mapper = require('./notification.mapper');
const policy = require('./notification.policy');
const repository = require('./notification.repository');
const {
  NOTIFICATION_EVENT_TYPES,
} = require('./notification.constants');

function getNotificationEventConfig(eventType) {
  return NOTIFICATION_EVENT_TYPES[eventType] || NOTIFICATION_EVENT_TYPES.system;
}

function getBrowserPushConfig() {
  const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '';
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '';
  const subject = process.env.WEB_PUSH_CONTACT_EMAIL
    ? `mailto:${process.env.WEB_PUSH_CONTACT_EMAIL}`
    : process.env.WEB_PUSH_SUBJECT || 'mailto:admin@nscict.local';

  return {
    configured: Boolean(publicKey && privateKey),
    publicKey,
    subject,
  };
}

function assertValidBrowserSubscription(subscription) {
  if (!subscription || typeof subscription !== 'object') {
    const error = new Error('Browser subscription payload is required.');
    error.statusCode = 400;
    throw error;
  }

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    const error = new Error('Browser subscription endpoint and keys are required.');
    error.statusCode = 400;
    throw error;
  }
}

async function emitNotificationEvent(event, executor = pool) {
  const eventConfig = getNotificationEventConfig(event.type);
  const rows = await repository.loadNotificationTargets(executor, event.recipient_user_ids || []);
  const targets = rows.map(mapper.mapDeliveryTargetRow);
  const created = [];

  for (const target of targets) {
    const allowInApp = policy.shouldDeliverForChannel(eventConfig, target.preferences, 'in_app');
    const allowEmail = policy.shouldDeliverForChannel(eventConfig, target.preferences, 'email');
    const allowBrowserPush = policy.shouldDeliverForChannel(eventConfig, target.preferences, 'browser_push');

    if (!allowInApp && !allowEmail && !allowBrowserPush) {
      continue;
    }

    let notificationRow = null;
    // Browser push and email deliveries both reference the notification row.
    // This also supports users who intentionally disable the in-app channel.
    if (allowInApp || allowEmail || allowBrowserPush) {
      notificationRow = await repository.insertNotification(executor, target, event, eventConfig);
    }
    if (notificationRow && allowInApp) {
      created.push(mapper.mapNotificationRow(notificationRow));
    }

    if (allowEmail && target.email) {
      await repository.insertEmailDelivery(executor, notificationRow, target, event);
    }

    if (allowBrowserPush && notificationRow) {
      await repository.insertBrowserPushDeliveries(executor, notificationRow, target, event);

      // Vercel functions do not keep a background worker alive between requests.
      // Dispatch this event before the request finishes and leave the delivery
      // in the queue for retry if the provider is temporarily unavailable.
      if (process.env.VERCEL === '1' || process.env.NOTIFICATION_INLINE_BROWSER_PUSH === 'true') {
        await processBrowserPushQueue(executor, {
          notificationId: notificationRow.notification_id,
          recipientUserId: target.user_id,
          limit: 50,
        });
      }
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

async function saveBrowserSubscription(userId, subscription, userAgent, executor = pool) {
  assertValidBrowserSubscription(subscription);
  const row = await repository.upsertBrowserSubscription(executor, userId, subscription, userAgent);
  await repository.updateNotificationPreferences(userId, { browser_push_enabled: true }, executor);
  return mapper.mapBrowserSubscriptionRow(row);
}

async function listBrowserSubscriptions(userId, executor = pool) {
  const rows = await repository.listBrowserSubscriptions(userId, executor);
  return rows.map(mapper.mapBrowserSubscriptionRow);
}

async function deleteBrowserSubscription(userId, subscriptionId, executor = pool) {
  const row = await repository.deactivateBrowserSubscription(executor, userId, subscriptionId);
  const subscriptions = await repository.listBrowserSubscriptions(userId, executor);
  const hasActiveDevice = subscriptions.some((subscription) => subscription.is_active);
  if (!hasActiveDevice) {
    await repository.updateNotificationPreferences(userId, { browser_push_enabled: false }, executor);
  }
  return mapper.mapBrowserSubscriptionRow(row);
}

async function enqueueBrowserTestNotification(user, executor = pool) {
  const [created] = await emitNotificationEvent(
    {
      type: 'system',
      recipient_user_ids: [user.user_id],
      title: 'Browser notifications enabled',
      message: 'This device can receive NSC secure system alerts.',
      related_record_type: 'system',
      related_record_id: null,
      payload: { source_type: 'system' },
      action_url: '/notifications',
      severity: 'info',
    },
    executor
  );
  return created || null;
}

module.exports = {
  NOTIFICATION_EVENT_TYPES,
  countUnreadNotifications,
  deleteBrowserSubscription,
  emitNotificationEvent,
  enqueueBrowserTestNotification,
  getBrowserPushConfig,
  getNotificationEventConfig,
  getNotificationPreferences,
  listBrowserSubscriptions,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  saveBrowserSubscription,
  shouldDeliverForChannel: policy.shouldDeliverForChannel,
  updateNotificationPreferences,
};
