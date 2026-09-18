import { useCallback, useEffect, useState } from 'react';
import { fetchUnreadNotificationCount } from '../services/notifications-api.js';

const NOTIFICATION_COUNT_EVENT = 'nsc:notifications:count-changed';

export function emitNotificationCountChanged(unreadCount = null) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(NOTIFICATION_COUNT_EVENT, { detail: { unreadCount } }));
}

export function useNotificationCount({ pollMs = 60000 } = {}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const nextCount = await fetchUnreadNotificationCount();
      setUnreadCount(nextCount);
      setError('');
    } catch (countError) {
      setError(countError.message || 'Failed to load notification count.');
    }
  }, []);

  useEffect(() => {
    refresh();

    const interval = pollMs ? window.setInterval(refresh, pollMs) : null;
    function handleCountChanged(event) {
      const nextCount = event.detail?.unreadCount;
      if (Number.isFinite(nextCount)) {
        setUnreadCount(Math.max(0, Number(nextCount)));
        return;
      }
      refresh();
    }

    window.addEventListener(NOTIFICATION_COUNT_EVENT, handleCountChanged);

    return () => {
      if (interval) window.clearInterval(interval);
      window.removeEventListener(NOTIFICATION_COUNT_EVENT, handleCountChanged);
    };
  }, [pollMs, refresh]);

  return {
    error,
    refresh,
    unreadCount,
  };
}
