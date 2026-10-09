import { memo } from 'react';
import { Link } from 'react-router-dom';
import { formatDateTime } from '../../../lib/formatting.js';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';

export const TicketCard = memo(function TicketCard({ ticket, detailPath = '/service-requests' }) {
  return (
    <article className="ticket-card">
      <div className="ticket-card-head">
        <div>
          <strong>{ticket.ticket_number || `#${ticket.request_id}`}</strong>
          <p>{ticket.subject}</p>
        </div>
        <div className="ui-inline-actions">
          <StatusBadge value={ticket.status} />
          <PriorityBadge value={ticket.priority} />
        </div>
      </div>
      <div className="ticket-card-meta">
        <span>{ticket.ticket_type || 'Incident'}</span>
        <span>{ticket.technician_name || 'Unassigned'}</span>
        <span>{formatDateTime(ticket.date_submitted)}</span>
      </div>
      <Link to={`${detailPath}/${ticket.request_id}`} aria-label={`View ticket ${ticket.ticket_number || ticket.request_id}`}>View ticket</Link>
    </article>
  );
});
