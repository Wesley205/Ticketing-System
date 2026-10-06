import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { fetchNotificationPreferences, updateNotificationPreferences } from '../services/notifications-api.js';

const CHANNELS = [
  ['in_app_enabled', 'In-app alerts'],
  ['email_enabled', 'Email'],
  ['browser_push_enabled', 'Browser push'],
];

const EVENTS = [
  ['assignment_enabled', 'Assignments'],
  ['status_change_enabled', 'Status changes'],
  ['comment_enabled', 'Comments'],
  ['attachment_enabled', 'Attachments'],
  ['sla_enabled', 'SLA alerts'],
  ['maintenance_enabled', 'Maintenance'],
  ['system_enabled', 'System and approvals'],
];

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchNotificationPreferences()
      .then(setPreferences)
      .catch(() => setMessage('Preferences could not be loaded.'));
  }, []);

  function toggle(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
    setMessage('');
  }

  async function save() {
    setIsSaving(true);
    setMessage('');
    try {
      const updated = await updateNotificationPreferences(preferences);
      setPreferences(updated);
      setMessage('Preferences saved.');
    } catch (error) {
      setMessage(error.message || 'Preferences could not be saved.');
    } finally {
      setIsSaving(false);
    }
  }

  if (!preferences) {
    return <section className="notification-preferences-panel"><p>{message || 'Loading notification preferences...'}</p></section>;
  }

  return (
    <section className="notification-preferences-panel">
      <div className="notification-preferences-head">
        <div>
          <h3>Alert preferences</h3>
          <p>Choose how you receive routine alerts. Critical operational alerts may still be delivered.</p>
        </div>
        <Button size="sm" onClick={save} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save preferences'}</Button>
      </div>
      <div className="notification-preference-groups">
        <fieldset>
          <legend>Delivery channels</legend>
          {CHANNELS.map(([key, label]) => (
            <label key={key}><input type="checkbox" checked={Boolean(preferences[key])} onChange={() => toggle(key)} /><span>{label}</span></label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Alert types</legend>
          {EVENTS.map(([key, label]) => (
            <label key={key}><input type="checkbox" checked={Boolean(preferences[key])} onChange={() => toggle(key)} /><span>{label}</span></label>
          ))}
        </fieldset>
      </div>
      {message ? <p className="notification-preferences-message" role="status">{message}</p> : null}
    </section>
  );
}
