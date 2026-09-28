import { useEffect, useState } from 'react';
import {
  browserPushSupported,
  disableBrowserPushSubscription,
  listBrowserPushSubscriptions,
  registerBrowserPushDevice,
  sendBrowserPushTest,
} from '../services/browser-push-api.js';

export function BrowserNotificationPanel() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const supported = browserPushSupported();

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
      await action();
      await refreshDevices();
      setMessage(successMessage);
    } catch (actionError) {
      setError(actionError.message || 'Browser notification action failed.');
    } finally {
      setIsBusy(false);
    }
  }

  const activeDevice = devices.find((device) => device.is_active);

  return (
    <section className="browser-notification-panel" aria-label="Browser notification settings">
      <div>
        <h3>Device Browser Alerts</h3>
        <p>Receive secure alerts on this device when ticket, SLA, or maintenance events need attention.</p>
      </div>

      {!supported ? (
        <p className="browser-notification-status warning">Browser push is not supported on this device.</p>
      ) : null}

      {error ? <p className="browser-notification-status error">{error}</p> : null}
      {message ? <p className="browser-notification-status success">{message}</p> : null}

      <div className="browser-notification-actions">
        <button
          type="button"
          className="ui-button ui-button-primary"
          disabled={!supported || isBusy}
          onClick={() => runAction(registerBrowserPushDevice, 'Browser notifications enabled for this device.')}
        >
          Enable this device
        </button>
        <button
          type="button"
          className="ui-button ui-button-secondary"
          disabled={!supported || isBusy || !activeDevice}
          onClick={() => runAction(sendBrowserPushTest, 'Test notification queued.')}
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
        <strong>{devices.filter((device) => device.is_active).length} active device</strong>
        <span>{activeDevice ? activeDevice.user_agent || 'Current browser registered' : 'No active browser device registered'}</span>
      </div>
    </section>
  );
}
