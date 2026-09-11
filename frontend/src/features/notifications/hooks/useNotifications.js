import { useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  filterNotifications,
  groupNotificationsByDate,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/notifications-api.js';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState('');

  async function refresh(nextFilter = filter) {
    setIsLoading(true);
    setError('');
    try {
      const rows = await fetchNotifications({ status: nextFilter });
      setNotifications(rows);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh(filter);
  }, [filter]);

  const visibleNotifications = useMemo(
    () => filterNotifications(notifications, filter),
    [notifications, filter]
  );

  const groups = useMemo(
    () => groupNotificationsByDate(visibleNotifications),
    [visibleNotifications]
  );

  async function markRead(notificationId) {
    setIsMutating(true);
    try {
      setNotifications((current) => current.map((notification) =>
        notification.notification_id === notificationId
          ? { ...notification, read_at: notification.read_at || new Date().toISOString() }
          : notification
      ));
      await markNotificationRead(notificationId);
    } finally {
      setIsMutating(false);
    }
  }

  async function markAllRead() {
    setIsMutating(true);
    try {
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at || readAt })));
      await markAllNotificationsRead();
    } finally {
      setIsMutating(false);
    }
  }

  return {
    error,
    filter,
    groups,
    isLoading,
    isMutating,
    notifications,
    refresh,
    setFilter,
    visibleNotifications,
    markAllRead,
    markRead,
  };
}
