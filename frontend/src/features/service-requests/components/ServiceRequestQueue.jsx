import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { ticketId } from './service-request-formatters.js';
import { ticketSlaState } from '../services/sla-labels.js';

function ServiceRequestRow({ ticket, onSelect, isSelected = false }) {
  const id = ticketId(ticket);
  const sla = ticketSlaState(ticket);

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
      aria-current={isSelected ? 'page' : undefined}
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
        <span className={`service-request-queue-sla service-request-queue-sla-${sla.tone}`}>{sla.label}</span>
      </div>

      <div className="service-request-row-assignee">
        <span>{ticket.technician_name || 'Unassigned'}</span>
        <span className="service-request-row-meta-separator" aria-hidden="true">·</span>
        <small>{formatDateTime(ticket.date_submitted)}</small>
      </div>

      <div className="service-request-row-actions" onClick={(event) => event.stopPropagation()}>
        <Link className="service-request-open-link" to={`/service-requests/${ticket.request_id}`} aria-label={`View ticket ${id}`}>
          <AppIcon name="open" size={16} />
          <span>View ticket</span>
        </Link>
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
  createLabel = 'New ticket',
  selectedTicketId = null,
}) {
  const start = tickets.length ? ((pagination.page - 1) * pagination.pageSize) + 1 : 0;
  const end = tickets.length ? start + tickets.length - 1 : 0;

  if (!tickets.length) {
    return (
      <EmptyState
        variant="search"
        title="No tickets found"
        description="No service requests match the current filters."
        actionLabel={createLabel}
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
            isSelected={String(ticket.request_id) === String(selectedTicketId)}
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
