const pool = require('../config/db');

const NOTIFICATION_EVENT_TYPES = {
  ticket_assigned: { category: 'assignment', critical: true, supportsEmail: true, severity: 'info' },
  ticket_updated: { category: 'status_change', critical: false, supportsEmail: true, severity: 'info' },
  ticket_resolved: { category: 'status_change', critical: false, supportsEmail: true, severity: 'success' },
  ticket_comment: { category: 'comment', critical: false, supportsEmail: true, severity: 'info' },
  ticket_attachment: { category: 'attachment', critical: false, supportsEmail: true, severity: 'info' },
  ticket_overdue: { category: 'sla', critical: true, supportsEmail: true, severity: 'warning' },
  ticket_escalated: { category: 'sla', critical: true, supportsEmail: true, severity: 'error' },
  maintenance_created: { category: 'maintenance', critical: false, supportsEmail: true, severity: 'info' },
  maintenance_completed: { category: 'maintenance', critical: false, supportsEmail: true, severity: 'success' },
  maintenance_due: { category: 'maintenance', critical: true, supportsEmail: true, severity: 'warning' },
  invitation_created: { category: 'system', critical: false, supportsEmail: true, severity: 'info' },
  account_expiry: { category: 'system', critical: true, supportsEmail: true, severity: 'warning' },
  system: { category: 'system', critical: false, supportsEmail: false, severity: 'info' },
};

const PREFERENCE_COLUMN_BY_CATEGORY = {
  assignment: 'assignment_enabled',
  status_change: 'status_change_enabled',
  comment: 'comment_enabled',
  attachment: 'attachment_enabled',
  sla: 'sla_enabled',
  maintenance: 'maintenance_enabled',
  system: 'system_enabled',
};

function getNotificationEventConfig(eventType) {
  return NOTIFICATION_EVENT_TYPES[eventType] || NOTIFICATION_EVENT_TYPES.system;
}

function getDefaultPreferenceRow(userId) {
  return {
    user_id: userId,
    in_app_enabled: true,
    email_enabled: false,
    assignment_enabled: true,
    status_change_enabled: true,
    maintenance_enabled: true,
    comment_enabled: true,
    attachment_enabled: true,
    sla_enabled: true,
    system_enabled: true,
  };
}

function shouldDeliverForChannel(eventConfig, preferences, channel) {
  const prefs = preferences || getDefaultPreferenceRow(null);
  const categoryColumn = PREFERENCE_COLUMN_BY_CATEGORY[eventConfig.category];
  const categoryEnabled = categoryColumn ? prefs[categoryColumn] !== false : true;

  if (channel === 'in_app') {
    if (eventConfig.critical) return true;
    return prefs.in_app_enabled !== false && categoryEnabled;
  }

  if (channel === 'email') {
    if (!eventConfig.supportsEmail) return false;
    if (prefs.email_enabled !== true) return false;
    return eventConfig.critical ? true : categoryEnabled;
  }

  return false;
}

async function ensurePreferenceRows(executor, recipientUserIds) {
  const ids = [...new Set(recipientUserIds.filter(Boolean).map(Number))];
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
  const ids = [...new Set(recipientUserIds.filter(Boolean).map(Number))];
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

  return result.rows.map((row) => ({
    ...row,
    preferences: {
      in_app_enabled: row.in_app_enabled,
      email_enabled: row.email_enabled,
      assignment_enabled: row.assignment_enabled,
      status_change_enabled: row.status_change_enabled,
      maintenance_enabled: row.maintenance_enabled,
      comment_enabled: row.comment_enabled,
      attachment_enabled: row.attachment_enabled,
      sla_enabled: row.sla_enabled,
      system_enabled: row.system_enabled,
    },
  }));
}

async function emitNotificationEvent(event, executor = pool) {
  const eventConfig = getNotificationEventConfig(event.type);
  const targets = await loadNotificationTargets(executor, event.recipient_user_ids || []);
  const created = [];

  for (const target of targets) {
    const allowInApp = shouldDeliverForChannel(eventConfig, target.preferences, 'in_app');
    const allowEmail = shouldDeliverForChannel(eventConfig, target.preferences, 'email');

    if (!allowInApp && !allowEmail) {
      continue;
    }

    let notificationRow = null;
    if (allowInApp) {
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
      notificationRow = inserted.rows[0];
      created.push(notificationRow);
    }

    if (allowEmail && target.email) {
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
  }

  return created;
}

async function listUserNotifications(userId, options = {}, executor = pool) {
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

async function countUnreadNotifications(userId, executor = pool) {
  const result = await executor.query(
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE recipient_user_id = $1
       AND is_read = FALSE`,
    [userId]
  );
  return Number(result.rows[0].count);
}

async function markNotificationRead(userId, notificationId, executor = pool) {
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

async function markAllNotificationsRead(userId, executor = pool) {
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

async function getNotificationPreferences(userId, executor = pool) {
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

async function updateNotificationPreferences(userId, updates, executor = pool) {
  await ensurePreferenceRows(executor, [userId]);
  const fields = [
    'in_app_enabled',
    'email_enabled',
    'assignment_enabled',
    'status_change_enabled',
    'maintenance_enabled',
    'comment_enabled',
    'attachment_enabled',
    'sla_enabled',
    'system_enabled',
  ];

  const values = fields.map((field) => (field in updates ? updates[field] : null));
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

module.exports = {
  NOTIFICATION_EVENT_TYPES,
  countUnreadNotifications,
  emitNotificationEvent,
  getNotificationEventConfig,
  getNotificationPreferences,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  shouldDeliverForChannel,
  updateNotificationPreferences,
};
