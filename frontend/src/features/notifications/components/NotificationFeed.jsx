import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { NotificationRow } from './NotificationRow.jsx';

function NotificationGroup({ label, rows, onView }) {
  return (
    <section className="notification-group">
      <div className="notification-group-head">
        <span>{label}</span>
        <small>{rows.length} item{rows.length === 1 ? '' : 's'}</small>
      </div>
      {rows.map((notification) => (
        <NotificationRow
          key={notification.notification_id}
          notification={notification}
          onView={onView}
        />
      ))}
    </section>
  );
}

export function NotificationFeed({ groups, onView }) {
  const total = groups.today.length + groups.earlier.length;

  if (!total) {
    return <EmptyState title="No notifications yet" description="Secure ticketing triggers and SLA alerts will appear here." />;
  }

  return (
    <div className="notification-feed-panel">
      <NotificationGroup label="Today" rows={groups.today} onView={onView} />
      <NotificationGroup label="Earlier" rows={groups.earlier} onView={onView} />
      <div className="notification-inbox-tip">
        <strong>Inbox tips</strong>
        <span>Use the View button to open a notification. It will automatically mark the item as read.</span>
      </div>
    </div>
  );
}
