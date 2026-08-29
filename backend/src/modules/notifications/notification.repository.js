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
            np.in_app_enabled, np.email_enabled, np.assignment_enabled, np.status_change_enabled,
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

async function listUserNotifications(userId, options, executor) {
  const limit = Math.max(1, Math.min(Number(options.limit) || 20, 100));
  const unreadOnly = String(options.unread || '').toLowerCase() === 'true';
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
            maintenance_enabled, comment_enabled, attachment_enabled, sla_enabled, system_enabled,
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
         assignment_enabled = COALESCE($4, assignment_enabled),
         status_change_enabled = COALESCE($5, status_change_enabled),
         maintenance_enabled = COALESCE($6, maintenance_enabled),
         comment_enabled = COALESCE($7, comment_enabled),
         attachment_enabled = COALESCE($8, attachment_enabled),
         sla_enabled = COALESCE($9, sla_enabled),
         system_enabled = COALESCE($10, system_enabled)
     WHERE user_id = $1
     RETURNING user_id, in_app_enabled, email_enabled, assignment_enabled, status_change_enabled,
               maintenance_enabled, comment_enabled, attachment_enabled, sla_enabled, system_enabled,
               updated_at`,
    [userId, ...values]
  );

  return result.rows[0] || null;
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
  insertEmailDelivery,
  insertNotification,
  listDueEmailDeliveries,
  listUserNotifications,
  loadNotificationTargets,
  markDeliveryFailed,
  markDeliveryProcessing,
  markDeliverySent,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
  getNotificationPreferences,
};
