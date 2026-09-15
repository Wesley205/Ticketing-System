import { formatDateTime } from '../../../lib/formatting.js';
import { eventTitle, formatRelativeTime } from './service-request-formatters.js';

export function TicketActivityTimeline({ history = [], limit = 5 }) {
  const rows = history.slice(0, limit);

  if (!rows.length) {
    return <p className="react-copy">No activity has been recorded yet.</p>;
  }

  return (
    <ol className="service-request-activity">
      {rows.map((entry) => (
        <li key={entry.history_id || entry.ticket_assignment_id || entry.created_at}>
          <span aria-hidden="true" />
          <div>
            <strong>{eventTitle(entry)}</strong>
            <small title={formatDateTime(entry.created_at || entry.assigned_at)}>
              {(entry.actor_name || entry.assigned_by_name || 'System')} / {formatRelativeTime(entry.created_at || entry.assigned_at)}
            </small>
            {entry.details || entry.assignment_notes ? <p>{entry.details || entry.assignment_notes}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
