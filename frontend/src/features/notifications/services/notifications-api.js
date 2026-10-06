import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

const sampleNotifications = [
  {
    notification_id: 'sample-1',
    severity: 'urgent',
    title: 'SLA Breached: Core Uplink Offline',
    message: 'SLA deadline passed. Tactical communication transponder remains unverified.',
    created_at: new Date().toISOString(),
    read_at: null,
    source_type: 'ticket',
    source_id: 1,
  },
  {
    notification_id: 'sample-2',
    severity: 'warning',
    title: 'Ticket Assigned: Crypto Rotation Failed',
    message: 'You have been assigned primary analyst for Level 4 cryptographic key fallback.',
    created_at: new Date(Date.now() - 22 * 60000).toISOString(),
    read_at: null,
    source_type: 'technician_ticket',
    source_id: 2,
  },
  {
    notification_id: 'sample-3',
    severity: 'info',
    title: 'User Comment Added: Sat-Com Uplink',
    message: 'Technical A. Nwosu added comment: Secondary uplink validated under standard protocol.',
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    read_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    source_type: 'ticket',
    source_id: 3,
  },
];

export function buildNotificationsQuery(filters = {}) {
  return buildQueryParams({
    status: filters.status === 'unread' ? 'unread' : '',
    page: filters.page || '',
    page_size: filters.pageSize || '',
  });
}

export function normalizeNotification(row = {}) {
  let payload = row.payload_json || row.payload || {};
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }

  const sourceId = row.source_id || row.entity_id || row.related_record_id || payload.source_id || payload.ticket_id || payload.request_id || null;
  const sourceType = row.source_type || row.entity_type || row.related_record_type || payload.source_type || (payload.ticket_id ? 'service_request' : '');

  return {
    notification_id: row.notification_id || row.id || `${row.source_type || 'notification'}-${row.source_id || row.created_at || 'unknown'}`,
    severity: String(row.severity || row.type || 'info').toLowerCase(),
    title: row.title || row.subject || 'Notification',
    message: row.message || row.body || row.description || '',
    created_at: row.created_at || row.timestamp || new Date().toISOString(),
    read_at: row.read_at || (row.is_read ? row.updated_at || row.created_at || new Date().toISOString() : null),
    source_type: sourceType,
    source_id: sourceId,
    action_url: row.action_url || row.url || '',
    actor_user_id: payload.actor_user_id || null,
    actor_name: payload.actor_name || '',
    actor_role: payload.actor_role || '',
    change_type: payload.change_type || '',
  };
}

export function normalizeNotificationsPayload(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.items || payload?.notifications || [];
  return rows.map(normalizeNotification);
}

export function filterNotifications(notifications = [], status = 'all') {
  if (status === 'unread') return notifications.filter((notification) => !notification.read_at);
  return notifications;
}

export function groupNotificationsByDate(notifications = [], now = new Date()) {
  const today = [];
  const earlier = [];

  notifications.forEach((notification) => {
    const created = new Date(notification.created_at);
    const sameDay =
      created.getFullYear() === now.getFullYear() &&
      created.getMonth() === now.getMonth() &&
      created.getDate() === now.getDate();

    if (sameDay) today.push(notification);
    else earlier.push(notification);
  });

  return { today, earlier };
}

export function notificationTarget(notification) {
  if (notification.source_type === 'technician_ticket' && notification.source_id) return `/technician/work/ticket/${notification.source_id}`;
  if ((notification.source_type === 'ticket' || notification.source_type === 'service_request') && notification.source_id) {
    return `/service-requests/${notification.source_id}`;
  }
  if (notification.action_url?.startsWith('/')) return notification.action_url;
  if (notification.source_type === 'maintenance') return '/maintenance';
  if (notification.source_type === 'audit') return '/audit-logs';
  return '';
}

export async function fetchUnreadNotificationCount() {
  try {
    const payload = await apiClient('/notifications/unread-count');
    return Number(payload?.unread_count || payload?.count || 0);
  } catch (error) {
    if (error.status === 404) {
      return sampleNotifications.filter((notification) => !notification.read_at).length;
    }
    throw error;
  }
}

export function relativeNotificationTime(value, now = new Date()) {
  const date = new Date(value);
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export async function fetchNotifications(filters = {}) {
  const query = buildNotificationsQuery(filters).toString();
  const suffix = query ? `?${query}` : '';

  try {
    const payload = await apiClient(`/notifications${suffix}`);
    return normalizeNotificationsPayload(payload);
  } catch (error) {
    if (error.status === 404) return sampleNotifications.map(normalizeNotification);
    throw error;
  }
}

export async function markNotificationRead(notificationId) {
  return apiClient(`/notifications/${notificationId}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return apiClient('/notifications/read-all', { method: 'POST' });
}

export async function fetchNotificationPreferences() {
  return apiClient('/notifications/preferences/me');
}

export async function updateNotificationPreferences(payload) {
  return apiClient('/notifications/preferences/me', {
    method: 'PATCH',
    body: payload,
  });
}
