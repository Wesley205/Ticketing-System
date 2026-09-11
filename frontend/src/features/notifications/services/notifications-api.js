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
  return {
    notification_id: row.notification_id || row.id || `${row.source_type || 'notification'}-${row.source_id || row.created_at || 'unknown'}`,
    severity: String(row.severity || row.type || 'info').toLowerCase(),
    title: row.title || row.subject || 'Notification',
    message: row.message || row.body || row.description || '',
    created_at: row.created_at || row.timestamp || new Date().toISOString(),
    read_at: row.read_at || null,
    source_type: row.source_type || row.entity_type || '',
    source_id: row.source_id || row.entity_id || null,
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
  if (notification.source_type === 'technician_ticket') return `/technician/work/ticket/${notification.source_id}`;
  if (notification.source_type === 'ticket') return `/service-requests/${notification.source_id}`;
  if (notification.source_type === 'maintenance') return '/maintenance';
  if (notification.source_type === 'audit') return '/audit-logs';
  return '';
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
  return apiClient(`/notifications/${notificationId}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiClient('/notifications/read-all', { method: 'PATCH' });
}
