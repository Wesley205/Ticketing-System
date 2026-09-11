import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

function slaMinutes(ticket) {
  const due = new Date(ticket.sla_resolution_due_at || ticket.expected_completion_at || Date.now());
  const minutes = Math.max(0, Math.round((due.getTime() - Date.now()) / 60000));
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}h : ${String(minutes % 60).padStart(2, '0')}m`;
}

export function OperationalTicketDetail({ ticket, isAdmin = false, onAssignOpen, onStatusSubmit, onCommentSubmit }) {
  const [note, setNote] = useState('');
  if (!ticket) return null;

  async function submitNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    await onCommentSubmit({ comment_body: note.trim(), is_internal: true });
    setNote('');
  }

  return (
    <div className="operational-ticket-detail">
      <section className="service-desk-detail-card">
        <div className="service-desk-detail-title">
          <div>
            <strong>{ticket.ticket_number || `#${ticket.request_id}`}</strong>
            <h3>{ticket.subject}</h3>
          </div>
          <div className="ui-inline-actions">
            <StatusBadge value={ticket.status} />
            <PriorityBadge value={ticket.priority} />
          </div>
        </div>
      </section>

      <section className="service-desk-detail-card">
        <h3>Internal Notes</h3>
        <div className="service-desk-message-list">
          {(ticket.comments || []).filter((comment) => comment.is_internal).slice(0, 3).map((comment) => (
            <article key={comment.comment_id}>
              <strong>{comment.author_name || 'ICT Officer'}</strong>
              <p>{comment.comment_body}</p>
            </article>
          ))}
        </div>
        <form className="service-desk-message-form" onSubmit={submitNote}>
          <textarea className="ui-input" rows={4} placeholder="Add an internal operational log..." value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="submit" disabled={!note.trim()}>Post Internal Note</Button>
        </form>
      </section>

      <section className="service-desk-operational-grid">
        <article className="service-desk-detail-card service-desk-sla-card">
          <h3>SLA Status</h3>
          <strong>{slaMinutes(ticket)}</strong>
          <small>Time remaining until SLA warning threshold</small>
        </article>
        <article className="service-desk-detail-card">
          <h3>Assignment</h3>
          <strong>{ticket.technician_name || 'Unassigned'}</strong>
          <Button variant="secondary" size="sm" onClick={onAssignOpen}>{ticket.assigned_technician_id ? 'Reassign' : 'Assign'}</Button>
        </article>
        <article className="service-desk-detail-card">
          <h3>System Specs</h3>
          <div className="ticket-meta-grid">
            <div><strong>Affected gateway</strong><span>{ticket.affected_asset_tag || '-'}</span></div>
            <div><strong>Risk level</strong><span>{ticket.priority || '-'}</span></div>
          </div>
        </article>
      </section>

      <section className="service-desk-detail-card">
        <h3>{isAdmin ? 'Admin Override Controls' : 'Next Actions'}</h3>
        <div className="service-desk-status-actions">
          {(ticket.permissions?.allowed_status_transitions || ['In Progress', 'Resolved']).map((status) => (
            <Button key={status} size="sm" variant={status === 'Resolved' ? 'primary' : 'secondary'} onClick={() => onStatusSubmit({ status, note: `${isAdmin ? 'Admin override' : 'Operational'} status update.` })}>
              {status}
            </Button>
          ))}
          {isAdmin ? <Button size="sm" variant="danger" onClick={onAssignOpen}>Force Reassign</Button> : null}
        </div>
      </section>

      <section className="service-desk-detail-card">
        <h3>Audit History</h3>
        <div className="secure-dashboard-audit-list">
          {(ticket.history || ticket.assignment_history || []).slice(0, 4).map((entry) => (
            <article key={entry.history_id || entry.ticket_assignment_id || entry.created_at}>
              <strong>{entry.event_type || entry.technician_name || 'Ticket event'}</strong>
              <span>{formatDateTime(entry.created_at || entry.assigned_at)}</span>
              <p>{entry.details || entry.assignment_notes || 'Operational update recorded.'}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
