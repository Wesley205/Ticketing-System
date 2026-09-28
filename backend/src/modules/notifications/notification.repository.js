const { PREFERENCE_FIELDS } = require('./notification.constants');

function normalizeIds(ids) {
  return [...new Set((ids || []).filter(Boolean).map(Number))];
}

async function ensurePreferenceRows(executor, recipientUserIds) {
  const ids = normalizeIds(recipientUserIds);
  if (!ids.length) return;

  await executor.query(
    `INSERT INTO notification_preferences (user_id)
     SELECT user_id
     FROM users
     WHERE user_id = ANY($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [ids]
  );
}

async function loadNotificationTargets(executor, recipientUserIds) {
  const ids = normalizeIds(recipientUserIds);
  if (!ids.length) return [];

  await ensurePreferenceRows(executor, ids);

  const result = await executor.query(
    `SELECT u.user_id, u.full_name, u.email, u.is_active,
            np.in_app_enabled, np.email_enabled, np.browser_push_enabled, np.assignment_enabled, np.status_change_enabled,
            np.maintenance_enabled, np.comment_enabled, np.attachment_enabled, np.sla_enabled,
            np.system_enabled
     FROM users u
     LEFT JOIN notification_preferences np ON np.user_id = u.user_id
     WHERE u.user_id = ANY($1)
       AND u.is_active = TRUE`,
    [ids]
  );

  return result.rows;
}

async function insertNotification(executor, target, event, eventConfig) {
  const inserted = await executor.query(
    `INSERT INTO notifications
      (recipient_user_id, notification_type, title, message, related_record_type, related_record_id,
       payload_json, is_read, severity, action_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE,$8,$9)
     RETURNING notification_id, recipient_user_id, notification_type, title, message, severity, created_at`,
    [
      target.user_id,
      event.type,
      event.title,
      event.message,
      event.related_record_type || null,
      event.related_record_id || null,
      JSON.stringify(event.payload || {}),
      event.severity || eventConfig.severity || 'info',
      event.action_url || null,
    ]
  );

  return inserted.rows[0] || null;
}

async function insertEmailDelivery(executor, notificationRow, target, event) {
  await executor.query(
    `INSERT INTO notification_deliveries
      (notification_id, recipient_user_id, channel, delivery_status, recipient_address, subject, body_text)
     VALUES ($1,$2,'email','pending',$3,$4,$5)`,
    [
      notificationRow ? notificationRow.notification_id : null,
      target.user_id,
      target.email,
      event.email_subject || event.title,
      event.email_body_text || event.message,
    ]
  );
}

async function insertBrowserPushDeliveries(executor, notificationRow, target, event) {
  if (!notificationRow) return 0;

  const result = await executor.query(
    `INSERT INTO notification_deliveries
      (notification_id, recipient_user_id, channel, delivery_status, recipient_address, subject, body_text)
     SELECT $1, bps.user_id, 'browser_push', 'pending', bps.endpoint, $2, $3
     FROM browser_push_subscriptions bps
     WHERE bps.user_id = $4
       AND bps.is_active = TRUE
     RETURNING notification_delivery_id`,
    [
      notificationRow.notification_id,
      event.browser_push_title || event.title,
      event.browser_push_body_text || event.message,
      target.user_id,
    ]
  );

  return result.rows.length;
}

async function listUserNotifications(userId, options, executor) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 20, 100));
  const unreadOnly =
    String(options.unread || '').toLowerCase() === 'true' ||
    String(options.status || '').toLowerCase() === 'unread';
  const params = [userId];
  let where = 'WHERE recipient_user_id = $1';

  if (unreadOnly) {
    where += ' AND is_read = FALSE';
  }

  params.push(limit);
  const result = await executor.query(
    `SELECT notification_id, notification_type, title, message, related_record_type, related_record_id,
            payload_json, is_read, read_at, created_at, severity, action_url
     FROM notifications
     ${where}
     ORDER BY created_at DESC
     LIMIT $2`,
    params
  );

  return result.rows;
}

async function countUnreadNotifications(userId, executor) {
  const result = await executor.query(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE recipient_user_id = $1
       AND is_read = FALSE`,
    [userId]
  );

  return Number(result.rows[0].count);
}

async function markNotificationRead(userId, notificationId, executor) {
  const result = await executor.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, NOW()),
         updated_at = NOW()
     WHERE notification_id = $1
       AND recipient_user_id = $2
     RETURNING notification_id, is_read, read_at`,
    [notificationId, userId]
  );

  return result.rows[0] || null;
}

async function markAllNotificationsRead(userId, executor) {
  const result = await executor.query(
    `UPDATE notifications
     SET is_read = TRUE,
         read_at = COALESCE(read_at, NOW()),
         updated_at = NOW()
     WHERE recipient_user_id = $1
       AND is_read = FALSE
     RETURNING notification_id`,
    [userId]
  );

  return result.rows.length;
}

async function getNotificationPreferences(userId, executor) {
  await ensurePreferenceRows(executor, [userId]);
  const result = await executor.query(
    `SELECT user_id, in_app_enabled, email_enabled, assignment_enabled, status_change_enabled,
            maintenance_enabled, comment_enabled, attachment_enabled, sla_enabled, system_enabled, browser_push_enabled,
            created_at, updated_at
     FROM notification_preferences
     WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

async function updateNotificationPreferences(userId, updates, executor) {
  await ensurePreferenceRows(executor, [userId]);
  const values = PREFERENCE_FIELDS.map((field) => (field in updates ? updates[field] : null));
  const result = await executor.query(
    `UPDATE notification_preferences
     SET in_app_enabled = COALESCE($2, in_app_enabled),
         email_enabled = COALESCE($3, email_enabled),
         browser_push_enabled = COALESCE($4, browser_push_enabled),
         assignment_enabled = COALESCE($5, assignment_enabled),
         status_change_enabled = COALESCE($6, status_change_enabled),
         maintenance_enabled = COALESCE($7, maintenance_enabled),
         comment_enabled = COALESCE($8, comment_enabled),
         attachment_enabled = COALESCE($9, attachment_enabled),
         sla_enabled = COALESCE($10, sla_enabled),
         system_enabled = COALESCE($11, system_enabled)
     WHERE user_id = $1
     RETURNING user_id, in_app_enabled, email_enabled, assignment_enabled, status_change_enabled,
               maintenance_enabled, comment_enabled, attachment_enabled, sla_enabled, system_enabled,
               browser_push_enabled,
               updated_at`,
    [userId, ...values]
  );

  return result.rows[0] || null;
}

async function upsertBrowserSubscription(executor, userId, subscription, userAgent) {
  const result = await executor.query(
    `INSERT INTO browser_push_subscriptions
      (user_id, endpoint, p256dh_key, auth_key, user_agent, is_active, revoked_at, last_used_at)
     VALUES ($1,$2,$3,$4,$5,TRUE,NULL,NOW())
     ON CONFLICT (endpoint) DO UPDATE
     SET user_id = EXCLUDED.user_id,
         p256dh_key = EXCLUDED.p256dh_key,
         auth_key = EXCLUDED.auth_key,
         user_agent = EXCLUDED.user_agent,
         is_active = TRUE,
         revoked_at = NULL,
         last_used_at = NOW(),
         updated_at = NOW()
     RETURNING browser_subscription_id, endpoint, user_agent, is_active, last_used_at, created_at, updated_at`,
    [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, userAgent || null]
  );

  return result.rows[0] || null;
}

async function listBrowserSubscriptions(userId, executor) {
  const result = await executor.query(
    `SELECT browser_subscription_id, endpoint, user_agent, is_active, last_used_at, created_at, updated_at
     FROM browser_push_subscriptions
     WHERE user_id = $1
     ORDER BY is_active DESC, created_at DESC`,
    [userId]
  );

  return result.rows;
}

async function deactivateBrowserSubscription(executor, userId, subscriptionId) {
  const result = await executor.query(
    `UPDATE browser_push_subscriptions
     SET is_active = FALSE,
         revoked_at = COALESCE(revoked_at, NOW()),
         updated_at = NOW()
     WHERE browser_subscription_id = $1
       AND user_id = $2
     RETURNING browser_subscription_id, endpoint, user_agent, is_active, last_used_at, created_at, updated_at`,
    [subscriptionId, userId]
  );

  return result.rows[0] || null;
}

async function deactivateBrowserSubscriptionByEndpoint(executor, endpoint) {
  await executor.query(
    `UPDATE browser_push_subscriptions
     SET is_active = FALSE,
         revoked_at = COALESCE(revoked_at, NOW()),
         updated_at = NOW()
     WHERE endpoint = $1`,
    [endpoint]
  );
}

async function listDueBrowserPushDeliveries(executor, maxAttempts) {
  const result = await executor.query(
    `SELECT nd.notification_delivery_id, nd.notification_id, nd.recipient_user_id, nd.channel,
            nd.delivery_status, nd.subject, nd.body_text, nd.attempt_count, nd.max_attempts,
            n.severity, n.action_url, n.related_record_type, n.related_record_id,
            bps.endpoint, bps.p256dh_key, bps.auth_key
     FROM notification_deliveries nd
     JOIN notifications n ON n.notification_id = nd.notification_id
     JOIN browser_push_subscriptions bps
       ON bps.endpoint = nd.recipient_address
      AND bps.is_active = TRUE
     WHERE nd.channel = 'browser_push'
       AND nd.delivery_status IN ('pending', 'deferred', 'failed')
       AND nd.next_attempt_at <= NOW()
       AND nd.attempt_count < LEAST(nd.max_attempts, $1)
     ORDER BY nd.queued_at ASC
     LIMIT 50`,
    [maxAttempts]
  );

  return result.rows;
}

async function listDueEmailDeliveries(executor, maxAttempts) {
  const result = await executor.query(
    `SELECT notification_delivery_id, notification_id, recipient_user_id, channel, delivery_status,
            recipient_address, subject, body_text, attempt_count, max_attempts
     FROM notification_deliveries
     WHERE channel = 'email'
       AND delivery_status IN ('pending', 'deferred', 'failed')
       AND next_attempt_at <= NOW()
       AND attempt_count < LEAST(max_attempts, $1)
     ORDER BY queued_at ASC
     LIMIT 50`,
    [maxAttempts]
  );

  return result.rows;
}

async function deferEmailDelivery(executor, deliveryId, reason, nextAttemptAt) {
  await executor.query(
    `UPDATE notification_deliveries
     SET delivery_status = 'deferred',
         attempt_count = attempt_count + 1,
         last_attempt_at = NOW(),
         last_error = $2,
         next_attempt_at = $3
     WHERE notification_delivery_id = $1`,
    [deliveryId, reason, nextAttemptAt]
  );
}

async function markDeliveryProcessing(executor, deliveryId) {
  await executor.query(
    `UPDATE notification_deliveries
     SET delivery_status = 'processing',
         last_attempt_at = NOW()
     WHERE notification_delivery_id = $1`,
    [deliveryId]
  );
}

async function markDeliverySent(executor, deliveryId, providerMessageId) {
  await executor.query(
    `UPDATE notification_deliveries
     SET delivery_status = 'sent',
         provider_name = 'smtp',
         provider_message_id = $2,
         attempt_count = attempt_count + 1,
         sent_at = NOW(),
         failed_at = NULL,
         last_error = NULL
     WHERE notification_delivery_id = $1`,
    [deliveryId, providerMessageId]
  );
}

async function markDeliveryFailed(executor, deliveryId, status, attemptCount, errorMessage, nextAttemptAt) {
  await executor.query(
    `UPDATE notification_deliveries
     SET delivery_status = $2,
         attempt_count = $3,
         failed_at = NOW(),
         last_error = $4,
         next_attempt_at = $5
     WHERE notification_delivery_id = $1`,
    [deliveryId, status, attemptCount, errorMessage, nextAttemptAt]
  );
}

module.exports = {
  countUnreadNotifications,
  deferEmailDelivery,
  ensurePreferenceRows,
  deactivateBrowserSubscription,
  deactivateBrowserSubscriptionByEndpoint,
  insertEmailDelivery,
  insertBrowserPushDeliveries,
  insertNotification,
  listBrowserSubscriptions,
  listDueBrowserPushDeliveries,
  listDueEmailDeliveries,
  listUserNotifications,
  loadNotificationTargets,
  markDeliveryFailed,
  markDeliveryProcessing,
  markDeliverySent,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  upsertBrowserSubscription,
  getNotificationPreferences,
};
