import { memo } from 'react';
import { Link } from 'react-router-dom';
import { notificationTarget, relativeNotificationTime } from '../services/notifications-api.js';

export const NotificationRow = memo(function NotificationRow({ notification, onView }) {
  const target = notificationTarget(notification);
  const isUnread = !notification.read_at;
  const isTicket = ['ticket', 'service_request', 'technician_ticket'].includes(notification.source_type);
  const actionLabel = target ? (isTicket ? 'View ticket' : 'View details') : 'Recorded';
  const rowLabel = `${isUnread ? 'Unread notification: ' : ''}${notification.title}${notification.ticket_number ? `, ticket ${notification.ticket_number}` : ''}`;
  const messageNamesActor = notification.actor_name && notification.message
    .toLowerCase()
    .includes(notification.actor_name.toLowerCase());

  const content = (
    <>
      <span className={`notification-row-dot${isUnread ? ' unread' : ''}`} aria-hidden="true" />
      <span className={`notification-severity notification-severity-${notification.severity}`}>
        {notification.severity}
      </span>
      <span className="notification-row-copy">
        <strong>{notification.title}</strong>
        <small>{notification.message}</small>
        {isTicket && (notification.ticket_number || notification.source_id) ? (
          <small className="notification-row-ticket">Ticket {notification.ticket_number || `#${notification.source_id}`}</small>
        ) : null}
        {notification.actor_name && !messageNamesActor ? (
          <small className="notification-row-actor">Changed by {notification.actor_name}</small>
        ) : null}
      </span>
      <span className="notification-row-time">{relativeNotificationTime(notification.created_at)}</span>
      <span className="notification-row-view">{actionLabel}</span>
    </>
  );

  if (!target) {
    return <div className={`notification-row${isUnread ? ' is-unread' : ''}`} role="group" aria-label={rowLabel}>{content}</div>;
  }

  return (
    <Link className={`notification-row${isUnread ? ' is-unread' : ''}`} to={target} onClick={() => onView(notification)} aria-label={rowLabel}>
      {content}
    </Link>
  );
});
