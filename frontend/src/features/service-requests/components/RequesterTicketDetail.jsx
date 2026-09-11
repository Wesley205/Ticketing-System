import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

export function RequesterTicketDetail({ ticket, onStatusSubmit, onCommentSubmit, onAttachmentDownload }) {
  const [message, setMessage] = useState('');
  if (!ticket) return null;
  const canClose = (ticket.permissions?.allowed_status_transitions || []).includes('Closed');

  async function submitMessage(event) {
    event.preventDefault();
    if (!message.trim()) return;
    await onCommentSubmit({ comment_body: message.trim(), is_internal: false });
    setMessage('');
  }

  return (
    <div className="requester-ticket-detail">
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
        {canClose ? (
          <div className="requester-confirmation-banner">
            <span>Awaiting confirmation</span>
            <Button size="sm" onClick={() => onStatusSubmit({ status: 'Closed', note: 'Requester confirmed resolution.' })}>
              Confirm resolved
            </Button>
          </div>
        ) : null}
        <div className="ticket-meta-grid">
          <div><strong>Submitted</strong><span>{formatDateTime(ticket.date_submitted)}</span></div>
          <div><strong>Updated</strong><span>{formatDateTime(ticket.updated_at || ticket.status_changed_at)}</span></div>
          <div><strong>Category</strong><span>{ticket.category || '-'}</span></div>
          <div><strong>Affected asset</strong><span>{ticket.affected_asset_tag || '-'}</span></div>
        </div>
        <p className="react-copy">{ticket.description || 'No request description provided.'}</p>
      </section>

      <section className="service-desk-detail-card">
        <h3>Attachments</h3>
        <div className="service-desk-attachment-grid">
          {(ticket.attachments || []).map((attachment) => (
            <button key={attachment.attachment_id} type="button" onClick={() => onAttachmentDownload(attachment.attachment_id, attachment.file_name)}>
              <span>{attachment.file_name}</span>
              <small>Download</small>
            </button>
          ))}
          {!(ticket.attachments || []).length ? <p className="react-copy">No attachments uploaded.</p> : null}
        </div>
      </section>

      <section className="service-desk-detail-card">
        <h3>Messages</h3>
        <div className="service-desk-message-list">
          {(ticket.comments || []).filter((comment) => !comment.is_internal).slice(0, 4).map((comment) => (
            <article key={comment.comment_id}>
              <strong>{comment.author_name || 'Support'}</strong>
              <p>{comment.comment_body}</p>
            </article>
          ))}
        </div>
        <form className="service-desk-message-form" onSubmit={submitMessage}>
          <textarea className="ui-input" rows={3} placeholder="Type a message..." value={message} onChange={(event) => setMessage(event.target.value)} />
          <Button type="submit" disabled={!message.trim()}>Send Message</Button>
        </form>
      </section>
    </div>
  );
}
