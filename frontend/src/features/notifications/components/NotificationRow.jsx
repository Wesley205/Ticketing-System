import { Link } from 'react-router-dom';
import { notificationTarget, relativeNotificationTime } from '../services/notifications-api.js';

export function NotificationRow({ notification, onView }) {
  const target = notificationTarget(notification);
  const isUnread = !notification.read_at;
  const actionLabel = target ? 'Open' : 'Recorded';

  const content = (
    <>
      <span className={`notification-row-dot${isUnread ? ' unread' : ''}`} aria-hidden="true" />
      <span className={`notification-severity notification-severity-${notification.severity}`}>
        {notification.severity}
      </span>
      <span className="notification-row-copy">
        <strong>{notification.title}</strong>
        <small>{notification.message}</small>
      </span>
      <span className="notification-row-time">{relativeNotificationTime(notification.created_at)}</span>
      <span className="notification-row-view">{actionLabel}</span>
    </>
  );

  if (!target) {
    return <div className="notification-row">{content}</div>;
  }

  return (
    <Link className="notification-row" to={target} onClick={() => onView(notification)}>
      {content}
    </Link>
  );
}
