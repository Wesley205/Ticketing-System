import { useEffect, useState } from 'react';
import {
  disableBrowserPushSubscription,
  getBrowserPushSupportStatus,
  listBrowserPushSubscriptions,
  registerBrowserPushDevice,
  sendBrowserPushTest,
} from '../services/browser-push-api.js';

export function BrowserNotificationPanel({ onNotificationSent }) {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const support = getBrowserPushSupportStatus();
  const supported = support.supported;

  async function refreshDevices() {
    if (!supported) return;
    try {
      const rows = await listBrowserPushSubscriptions();
      setDevices(Array.isArray(rows) ? rows : []);
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Failed to load browser notification devices.');
    }
  }

  useEffect(() => {
    refreshDevices();
  }, [supported]);

  async function runAction(action, successMessage) {
    setIsBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await action();
      await refreshDevices();
      if (result?.notification && typeof onNotificationSent === 'function') {
        await onNotificationSent(result.notification);
      }
      setMessage(
        typeof successMessage === 'function'
          ? successMessage(result)
          : successMessage
      );
    } catch (actionError) {
      setError(actionError.message || 'Browser notification action failed.');
    } finally {
      setIsBusy(false);
    }
  }

  const activeDevice = devices.find((device) => device.is_active);
  const activeCount = devices.filter((device) => device.is_active).length;

  return (
    <section className="browser-notification-panel" aria-label="Browser notification settings">
      <div>
        <h3>Device Browser Alerts</h3>
        <p>Receive secure alerts on this device when ticket, SLA, or maintenance events need attention.</p>
      </div>

      {!supported ? (
        <p className="browser-notification-status warning">{support.reason}</p>
      ) : null}

      {error ? <p className="browser-notification-status error">{error}</p> : null}
      {message ? <p className="browser-notification-status success">{message}</p> : null}

      <div className="browser-notification-actions">
        <button
          type="button"
          className="ui-button ui-button-primary"
          disabled={!supported || isBusy}
          onClick={() => runAction(registerBrowserPushDevice, 'This browser is ready for alerts.')}
        >
          Enable this device
        </button>
        <button
          type="button"
          className="ui-button ui-button-secondary"
          disabled={!supported || isBusy || !activeDevice}
          onClick={() =>
            runAction(
              sendBrowserPushTest,
              (result) => (result?.dispatched ? 'Test notification sent.' : 'Test notification queued.')
            )
          }
        >
          Test notification
        </button>
        <button
          type="button"
          className="ui-button ui-button-secondary"
          disabled={!supported || isBusy || !activeDevice}
          onClick={() =>
            runAction(
              () => disableBrowserPushSubscription(activeDevice.browser_subscription_id),
              'Browser notifications disabled for this device.'
            )
          }
        >
          Disable this device
        </button>
      </div>

      <div className="browser-notification-devices">
        <strong>{activeCount} active device{activeCount === 1 ? '' : 's'}</strong>
        <span>{activeDevice ? 'This browser is registered for alerts.' : 'No browser device registered yet.'}</span>
      </div>
    </section>
  );
}
