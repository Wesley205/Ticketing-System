import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { BrowserNotificationPanel } from '../components/BrowserNotificationPanel.jsx';
import { NotificationFeed } from '../components/NotificationFeed.jsx';
import { NotificationFilters } from '../components/NotificationFilters.jsx';
import { useNotifications } from '../hooks/useNotifications.js';

export function NotificationInboxPage() {
  const notifications = useNotifications();
  const unreadCount = notifications.notifications.filter((notification) => !notification.read_at).length;

  return (
    <SecureWorkspaceLayout title="Notification System Workspace" subtitle="ICT Service Hub">
      <section className="notification-inbox-head">
        <div>
          <h2>Notification Feed</h2>
          <p>Manage real-time secure ticketing triggers, SLA alarms, and gateway audits.</p>
        </div>
        <NotificationFilters
          filter={notifications.filter}
          unreadCount={unreadCount}
          onFilterChange={notifications.setFilter}
          onMarkAllRead={notifications.markAllRead}
          isMutating={notifications.isMutating}
        />
      </section>

      <BrowserNotificationPanel />

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

      <footer className="notification-secure-footer">
        <span>National Security Council ICT Department. Secure internal infrastructure.</span>
        <small>NODE: NSC-AUTH-PR00-09 // LATENCY: 14ms // ROLE: ICT_OFFICER_SECURE_INBOX</small>
      </footer>
    </SecureWorkspaceLayout>
  );
}
