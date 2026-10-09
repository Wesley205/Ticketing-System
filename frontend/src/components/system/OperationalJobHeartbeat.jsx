import { useEffect } from 'react';
import { apiClient } from '../../lib/api-client.js';

const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_DELAY_MS = 15 * 1000;

export function OperationalJobHeartbeat({ userId }) {
  useEffect(() => {
    if (!userId) return undefined;
    let stopped = false;
    let requestRunning = false;

    async function runHeartbeat() {
      if (stopped || requestRunning || document.visibilityState === 'hidden') return;
      requestRunning = true;
      try {
        await apiClient('/system/jobs/activity', {
          method: 'POST',
          clearSessionOnUnauthorized: false,
        });
      } catch {
        // The next heartbeat or daily recovery sweep retries operational work.
      } finally {
        requestRunning = false;
      }
    }

    const initialTimer = window.setTimeout(runHeartbeat, INITIAL_DELAY_MS);
    const intervalTimer = window.setInterval(runHeartbeat, HEARTBEAT_INTERVAL_MS);
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') runHeartbeat();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      stopped = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId]);
  return null;
}
