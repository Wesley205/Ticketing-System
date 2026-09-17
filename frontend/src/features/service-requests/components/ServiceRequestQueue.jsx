import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { ticketId } from './service-request-formatters.js';

function ServiceRequestRow({ ticket, onSelect }) {
  const id = ticketId(ticket);

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(ticket);
    }
  }

  return (
    <article
      className="service-request-row"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(ticket)}
      onKeyDown={handleKeyDown}
    >
      <div className="service-request-row-id">
        <strong>{id}</strong>
        <span>{ticket.ticket_type || 'Incident'}</span>
      </div>

      <div className="service-request-row-subject">
        <strong title={ticket.subject}>{ticket.subject || 'Untitled request'}</strong>
        <span>
          {ticket.requester_name || 'Requester unavailable'}
          {ticket.department_name ? ` / ${ticket.department_name}` : ''}
        </span>
      </div>

      <div className="service-request-row-badges">
        <PriorityBadge value={ticket.priority} />
        <StatusBadge value={ticket.status} />
      </div>

      <div className="service-request-row-assignee">
        <span>{ticket.technician_name || 'Unassigned'}</span>
        <small>{formatDateTime(ticket.date_submitted)}</small>
      </div>

      <div className="service-request-row-actions" onClick={(event) => event.stopPropagation()}>
        <Link to={`/service-requests/${ticket.request_id}`}>Open</Link>
      </div>
    </article>
  );
}

export function ServiceRequestQueue({
  tickets = [],
  pagination,
  totalTickets = 0,
  onSelect,
  onCreate,
  onPrevious,
  onNext,
}) {
  const start = tickets.length ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0;
  const end = tickets.length ? start + tickets.length - 1 : 0;

  if (!tickets.length) {
    return (
      <EmptyState
        variant="search"
        title="No tickets found"
        description="No service requests match the current filters."
        actionLabel="Create Ticket"
        onAction={onCreate}
      />
    );
  }

  return (
    <div className="service-request-queue">
      <div className="service-request-queue-head">
        <span>Ticket</span>
        <span>Subject</span>
        <span>Priority / status</span>
        <span>Assignee / submitted</span>
        <span>Actions</span>
      </div>

      <div className="service-request-queue-rows">
        {tickets.map((ticket) => (
          <ServiceRequestRow
            key={ticket.request_id}
            ticket={ticket}
            onSelect={onSelect}
          />
        ))}
      </div>

      <footer className="service-request-queue-footer">
        <span>{start}-{end} of {totalTickets}</span>
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPrevious={onPrevious} onNext={onNext} />
      </footer>
    </div>
  );
}
