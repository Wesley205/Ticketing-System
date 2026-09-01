import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { TicketCard } from './TicketCard.jsx';

export function TicketList({
  tickets = [],
  onAssign,
  canManageAssignments = false,
  detailBasePath = '/service-requests',
}) {
  if (!tickets.length) {
    return <EmptyState title="No tickets found." description="Try adjusting your filters or create a new request." />;
  }

  return (
    <div className="ui-stack-md">
      <div className="ticket-mobile-list">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.request_id} ticket={ticket} detailPath={detailBasePath} />
        ))}
      </div>

      <div className="ticket-desktop-list">
        <DataTable
          columns={[
            {
              key: 'ticket_number',
              label: 'Ticket',
              render: (ticket) => (
                <Link to={`${detailBasePath}/${ticket.request_id}`}>
                  {ticket.ticket_number || `#${ticket.request_id}`}
                </Link>
              ),
            },
            { key: 'ticket_type', label: 'Type' },
            { key: 'subject', label: 'Subject' },
            {
              key: 'priority',
              label: 'Priority',
              render: (ticket) => <PriorityBadge value={ticket.priority} />,
            },
            {
              key: 'status',
              label: 'Status',
              render: (ticket) => <StatusBadge value={ticket.status} />,
            },
            {
              key: 'technician_name',
              label: 'Assignee',
              render: (ticket) => ticket.technician_name || 'Unassigned',
            },
            {
              key: 'expected_completion_at',
              label: 'Expected',
              render: (ticket) => formatDateTime(ticket.expected_completion_at),
            },
            {
              key: 'date_submitted',
              label: 'Submitted',
              render: (ticket) => formatDateTime(ticket.date_submitted),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (ticket) => (
                <div className="ui-inline-actions">
                  {canManageAssignments && !['Closed', 'Cancelled'].includes(ticket.status) ? (
                    <button type="button" className="ticket-link-button" onClick={() => onAssign(ticket)}>
                      {ticket.assigned_technician_id ? 'Reassign' : 'Assign'}
                    </button>
                  ) : null}
                  <Link to={`${detailBasePath}/${ticket.request_id}`}>Open</Link>
                </div>
              ),
            },
          ]}
          rows={tickets}
        />
      </div>
    </div>
  );
}
