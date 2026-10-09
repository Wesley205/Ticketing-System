import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { NotificationFeed } from '../components/NotificationFeed.jsx';
import { NotificationFilters } from '../components/NotificationFilters.jsx';
import { BrowserNotificationPanel } from '../components/BrowserNotificationPanel.jsx';
import { NotificationPreferencesPanel } from '../components/NotificationPreferencesPanel.jsx';
import { useNotifications } from '../hooks/useNotifications.js';

export function NotificationInboxPage() {
  const notifications = useNotifications();
  const unreadCount = notifications.notifications.filter((notification) => !notification.read_at).length;

  return (
    <SecureWorkspaceLayout title="Notification System Workspace" subtitle="ICT Service Hub">
      <section className="notification-inbox-head">
        <div>
          <h2>Notification Feed</h2>
          <p>Review ticket updates, SLA warnings, maintenance reminders, and system activity.</p>
        </div>
        <NotificationFilters
          filter={notifications.filter}
          unreadCount={unreadCount}
          onFilterChange={notifications.setFilter}
          onMarkAllRead={notifications.markAllRead}
          isMutating={notifications.isMutating}
        />
      </section>

      {notifications.error ? (
        <ErrorState
          title="Notification inbox unavailable"
          description={notifications.error}
          onRetry={() => notifications.refresh(notifications.filter)}
        />
      ) : null}

      {notifications.isLoading ? (
        <LoadingState variant="table" description="Loading notification feed..." />
      ) : (
        <NotificationFeed groups={notifications.groups} onView={(notification) => notifications.markRead(notification.notification_id)} />
      )}

      <section className="notification-secondary-settings" aria-labelledby="notification-settings-heading">
        <div className="notification-secondary-settings-head">
          <div>
            <h3 id="notification-settings-heading">Notification settings</h3>
            <p>Optional delivery settings for this account and browser.</p>
          </div>
        </div>
        <BrowserNotificationPanel />
        <NotificationPreferencesPanel />
      </section>

      <footer className="notification-secure-footer">
        <span>National Security Council ICT Department. Secure internal service desk.</span>
        <small>System status: protected workspace // Role: ICT officer</small>
      </footer>
    </SecureWorkspaceLayout>
  );
}
