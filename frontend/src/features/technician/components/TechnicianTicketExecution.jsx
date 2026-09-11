import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

const statusActions = [
  { label: 'Accept', status: 'Accepted' },
  { label: 'Start Work', status: 'In Progress' },
  { label: 'Wait for User', status: 'Waiting for User' },
  { label: 'Resolve Ticket', status: 'Resolved', primary: true },
];

function attachmentSize(attachment) {
  const bytes = Number(attachment.file_size_bytes || 0);
  if (!bytes) return '-';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function TechnicianTicketExecution({
  ticket,
  onStatusSubmit,
  onCommentSubmit,
  onAttachmentUpload,
  onAttachmentDownload,
  isMutating = false,
}) {
  const [note, setNote] = useState('');
  const [noteInternal, setNoteInternal] = useState(true);
  const [resolution, setResolution] = useState({
    time_spent_minutes: '',
    root_cause: '',
    resolution: '',
  });
  const [file, setFile] = useState(null);

  async function submitStatus(status) {
    await onStatusSubmit({
      status,
      note: note.trim(),
      resolution: status === 'Resolved' ? resolution.resolution.trim() : '',
      time_spent_minutes: resolution.time_spent_minutes || undefined,
      root_cause: resolution.root_cause.trim(),
    });
    setNote('');
  }

  async function submitNote(event) {
    event.preventDefault();
    if (!note.trim()) return;
    await onCommentSubmit({
      comment_body: note.trim(),
      is_internal: noteInternal,
    });
    setNote('');
  }

  async function submitAttachment(event) {
    event.preventDefault();
    if (!file) return;
    await onAttachmentUpload({ file, is_internal: true });
    setFile(null);
    const input = document.getElementById('technician-evidence-upload');
    if (input) input.value = '';
  }

  return (
    <div className="technician-execution">
      <section className="technician-execution-head">
        <div className="technician-execution-badges">
          <strong>{ticket.ticket_number || `#${ticket.request_id}`}</strong>
          <StatusBadge value={ticket.status} />
          <PriorityBadge value={ticket.priority} />
        </div>
        <h2>{ticket.subject || 'Assigned ticket execution'}</h2>
      </section>

      <section className="technician-execution-grid">
        <div className="technician-execution-left">
          <article className="technician-execution-card">
            <h3>Ticket Context &amp; Assets</h3>
            <div className="technician-execution-divider" />
            <span className="technician-execution-label">Description</span>
            <p>{ticket.description || 'No description provided.'}</p>
            <div className="technician-execution-meta">
              <div><span>Requester</span><strong>{ticket.requester_name || '-'}</strong></div>
              <div><span>Department</span><strong>{ticket.department_name || '-'}</strong></div>
              <div><span>Affected Asset</span><strong>{ticket.affected_asset_tag || (ticket.affected_asset_id ? `Asset #${ticket.affected_asset_id}` : '-')}</strong></div>
              <div><span>SLA Deadline</span><strong className="technician-dashboard-overdue-text">{formatDateTime(ticket.sla_resolution_due_at || ticket.expected_completion_at)}</strong></div>
            </div>
          </article>

          <article className="technician-execution-card">
            <h3>Update Ticket Status</h3>
            <div className="technician-execution-status-actions">
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  variant={action.primary ? 'primary' : 'secondary'}
                  disabled={isMutating}
                  onClick={() => submitStatus(action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </article>
        </div>

        <div className="technician-execution-right">
          <article className="technician-execution-card">
            <form className="technician-execution-note-form" onSubmit={submitNote}>
              <div className="technician-execution-note-tabs">
                <button type="button" className={noteInternal ? 'active' : ''} onClick={() => setNoteInternal(true)}>Internal Note</button>
                <button type="button" className={!noteInternal ? 'active' : ''} onClick={() => setNoteInternal(false)}>Public Comment</button>
              </div>
              <textarea
                className="ui-input"
                rows={5}
                placeholder={noteInternal ? 'Type secure operational note here...' : 'Type public ticket comment here...'}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <div className="technician-execution-card-footer">
                <small>Internal notes are only visible to security officers</small>
                <Button size="sm" type="submit" disabled={isMutating || !note.trim()}>
                  {noteInternal ? 'Add Note' : 'Add Comment'}
                </Button>
              </div>
            </form>
          </article>

          <article className="technician-execution-card">
            <div className="technician-execution-card-head">
              <h3>Evidence Files</h3>
              <form onSubmit={submitAttachment}>
                <label className="ticket-link-button" htmlFor="technician-evidence-upload">Upload File</label>
                <input
                  id="technician-evidence-upload"
                  className="technician-execution-file-input"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                {file ? <Button size="sm" type="submit" disabled={isMutating}>Save</Button> : null}
              </form>
            </div>
            <div className="technician-execution-file-list">
              {(ticket.attachments || []).map((attachment) => (
                <button
                  type="button"
                  key={attachment.attachment_id}
                  onClick={() => onDownloadAttachment(attachment.attachment_id, attachment.file_name)}
                >
                  <span>{attachment.file_name}</span>
                  <small>{attachmentSize(attachment)}</small>
                </button>
              ))}
              {!(ticket.attachments || []).length ? <p>No evidence files uploaded yet.</p> : null}
            </div>
          </article>

          <article className="technician-execution-card">
            <h3>Resolution Details <span>Required only on resolve</span></h3>
            <div className="technician-execution-resolution-grid">
              <FormField label="Time Spent (mins)" htmlFor="technician-resolution-time">
                <input
                  id="technician-resolution-time"
                  className="ui-input"
                  value={resolution.time_spent_minutes}
                  onChange={(event) => setResolution((current) => ({ ...current, time_spent_minutes: event.target.value }))}
                />
              </FormField>
              <FormField label="Root Cause" htmlFor="technician-resolution-root">
                <input
                  id="technician-resolution-root"
                  className="ui-input"
                  value={resolution.root_cause}
                  onChange={(event) => setResolution((current) => ({ ...current, root_cause: event.target.value }))}
                />
              </FormField>
            </div>
            <FormField label="Resolution Summary" htmlFor="technician-resolution-summary">
              <textarea
                id="technician-resolution-summary"
                className="ui-input"
                rows={4}
                value={resolution.resolution}
                onChange={(event) => setResolution((current) => ({ ...current, resolution: event.target.value }))}
              />
            </FormField>
          </article>
        </div>
      </section>
    </div>
  );
}
