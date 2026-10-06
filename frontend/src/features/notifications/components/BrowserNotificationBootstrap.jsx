import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import {
  getBrowserPushSupportStatus,
  registerBrowserPushDevice,
  restoreBrowserPushDevice,
} from '../services/browser-push-api.js';

const DISMISSED_KEY_PREFIX = 'nsc:browser-alerts:dismissed:';
const RESTORED_KEY_PREFIX = 'nsc:browser-alerts:restored:';

function sessionKey(prefix, userId) {
  return `${prefix}${userId || 'unknown'}`;
}

export function clearBrowserNotificationSessionState(userId) {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(sessionKey(DISMISSED_KEY_PREFIX, userId));
  window.sessionStorage.removeItem(sessionKey(RESTORED_KEY_PREFIX, userId));
}

export function BrowserNotificationBootstrap({ userId }) {
  const [promptOpen, setPromptOpen] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return undefined;

    const support = getBrowserPushSupportStatus();
    if (!support.supported) return undefined;

    const dismissedKey = sessionKey(DISMISSED_KEY_PREFIX, userId);
    const restoredKey = sessionKey(RESTORED_KEY_PREFIX, userId);
    const permission = window.Notification.permission;

    if (permission === 'granted') {
      if (window.sessionStorage.getItem(restoredKey)) return undefined;
      window.sessionStorage.setItem(restoredKey, 'true');
      restoreBrowserPushDevice().catch(() => {
        window.sessionStorage.removeItem(restoredKey);
      });
      return undefined;
    }

    if (permission === 'default' && !window.sessionStorage.getItem(dismissedKey)) {
      setPromptOpen(true);
    }

    return undefined;
  }, [userId]);

  function dismiss() {
    window.sessionStorage.setItem(sessionKey(DISMISSED_KEY_PREFIX, userId), 'true');
    setPromptOpen(false);
    setError('');
  }

  async function enable() {
    setIsEnabling(true);
    setError('');
    try {
      await registerBrowserPushDevice();
      window.sessionStorage.setItem(sessionKey(RESTORED_KEY_PREFIX, userId), 'true');
      setPromptOpen(false);
    } catch (enableError) {
      setError(enableError.message || 'Browser alerts could not be enabled.');
    } finally {
      setIsEnabling(false);
    }
  }

  return (
    <Modal
      open={promptOpen}
      title="Enable browser alerts"
      onClose={dismiss}
      className="browser-alert-prompt"
      footer={(
        <>
          <Button variant="secondary" onClick={dismiss} disabled={isEnabling}>Not now</Button>
          <Button onClick={enable} disabled={isEnabling}>
            {isEnabling ? 'Enabling...' : 'Enable alerts'}
          </Button>
        </>
      )}
    >
      <div className="browser-alert-prompt-copy">
        <p>Allow this device to show ticket assignments, status changes, and urgent SLA alerts when the app is not in view.</p>
        <small>You can change notification permission later in your browser settings.</small>
        {error ? <p className="ui-field-error" role="alert">{error}</p> : null}
      </div>
    </Modal>
  );
}
