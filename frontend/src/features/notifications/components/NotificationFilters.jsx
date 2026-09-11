import { Button } from '../../../components/forms/Button.jsx';

export function NotificationFilters({
  filter,
  unreadCount,
  onFilterChange,
  onMarkAllRead,
  isMutating = false,
}) {
  return (
    <div className="notification-filter-row">
      <div className="notification-filter-tabs">
        <Button size="sm" variant={filter === 'all' ? 'primary' : 'secondary'} onClick={() => onFilterChange('all')}>
          All Notifications
        </Button>
        <Button size="sm" variant={filter === 'unread' ? 'primary' : 'secondary'} onClick={() => onFilterChange('unread')}>
          Unread ({unreadCount})
        </Button>
      </div>
      <Button size="sm" variant="secondary" onClick={onMarkAllRead} disabled={isMutating || unreadCount === 0}>
        Mark All Read
      </Button>
    </div>
  );
}
