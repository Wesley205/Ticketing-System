import { Link } from 'react-router-dom';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { TicketActionCenter } from './TicketActionCenter.jsx';
import { TicketActivityTimeline } from './TicketActivityTimeline.jsx';
import { ticketId } from './service-request-formatters.js';

export function ServiceRequestPreview({
  ticket,
  isAdmin = false,
  isOperational = false,
  onAssignOpen,
  onStatusSubmit,
  isMutating = false,
}) {
  if (!ticket) return null;

  const publicComments = (ticket.comments || []).filter((comment) => !comment.is_internal);
  const internalComments = (ticket.comments || []).filter((comment) => comment.is_internal);
  const canAssign = Boolean(ticket.permissions?.can_assign);
  const canInternal = Boolean(ticket.permissions?.can_add_internal_note);
  const latestPublic = publicComments.at(-1);
  const latestInternal = internalComments.at(-1);

  return (
    <article className="service-request-preview">
      <header className="service-request-preview-header">
        <div>
          <strong>{ticketId(ticket)}</strong>
          <h3>{ticket.subject || 'Untitled request'}</h3>
        </div>
        <div className="ui-inline-actions">
          <StatusBadge value={ticket.status} />
          <PriorityBadge value={ticket.priority} />
        </div>
      </header>

      <section className="service-request-preview-section">
        <h4>Ticket overview</h4>
        <dl className="service-request-definition-list">
          <div><dt>Requester</dt><dd>{ticket.requester_name || '-'}</dd></div>
          <div><dt>Created</dt><dd>{formatDateTime(ticket.date_submitted)}</dd></div>
          <div><dt>Department</dt><dd>{ticket.department_name || '-'}</dd></div>
        </dl>
        <p>{ticket.description || 'No description provided.'}</p>
      </section>

      <TicketActionCenter
        ticket={ticket}
        isAdmin={isAdmin}
        canAssign={canAssign}
        onAssignOpen={onAssignOpen}
        onStatusSubmit={onStatusSubmit}
        isMutating={isMutating}
      />

      <section className="service-request-preview-section">
        <h4>Communication</h4>
        {latestPublic ? (
          <p><strong>Latest reply:</strong> {latestPublic.comment_body}</p>
        ) : (
          <p>No requester-visible replies yet.</p>
        )}
        {isOperational && canInternal ? (
          latestInternal ? (
            <p><strong>Internal note:</strong> {latestInternal.comment_body}</p>
          ) : (
            <p>Internal notes are available to authorized ICT users.</p>
          )
        ) : null}
        {ticket.permissions?.can_add_comment ? <Link to={`/service-requests/${ticket.request_id}`}>Reply in full details</Link> : null}
      </section>

      <section className="service-request-preview-section">
        <h4>Activity</h4>
        <TicketActivityTimeline history={ticket.history || []} limit={4} />
      </section>

      <details className="service-request-technical-details">
        <summary>Technical details</summary>
        <dl className="service-request-definition-list">
          <div><dt>Type</dt><dd>{ticket.ticket_type || '-'}</dd></div>
          <div><dt>Category</dt><dd>{ticket.category || '-'}{ticket.subcategory ? ` / ${ticket.subcategory}` : ''}</dd></div>
          <div><dt>Impact</dt><dd>{ticket.impact || '-'}</dd></div>
          <div><dt>Urgency</dt><dd>{ticket.urgency || '-'}</dd></div>
          <div><dt>Affected asset</dt><dd>{ticket.affected_asset_tag || '-'}</dd></div>
          <div><dt>Source</dt><dd>{ticket.source_channel || '-'}</dd></div>
        </dl>
      </details>

      <footer className="service-request-preview-footer">
        <Link to={`/service-requests/${ticket.request_id}`}>Open full details</Link>
      </footer>
    </article>
  );
}
