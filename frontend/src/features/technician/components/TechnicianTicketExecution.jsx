import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { ImageGallery } from '../../../components/media/ImageGallery.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { formatBytes, isSupportedImageType } from '../../../lib/media-files.js';

const MAX_TICKET_IMAGES = 3;

function buildTechnicianStatusActions(ticket = {}) {
  const transitions = ticket.permissions?.allowed_status_transitions || ticket.allowed_status_transitions || [];
  const status = ticket.status || '';
  const hasTransition = (nextStatus) => transitions.includes(nextStatus);

  if (status === 'Assigned') {
    return [
      hasTransition('Accepted') ? { label: 'Accept', status: 'Accepted', icon: 'check' } : null,
      hasTransition('Pending') ? { label: 'Unavailable', status: 'Pending', icon: 'pause', note: 'Technician marked unavailable for this assigned ticket.' } : null,
    ].filter(Boolean);
  }

  if (status === 'Accepted') {
    return hasTransition('In Progress') ? [{ label: 'Start Work', status: 'In Progress', icon: 'play', primary: true }] : [];
  }

  if (status === 'In Progress') {
    return [
      hasTransition('Waiting for User') ? { label: 'Waiting for User', status: 'Waiting for User', icon: 'clock' } : null,
      hasTransition('Waiting for Parts') ? { label: 'Waiting for Parts', status: 'Waiting for Parts', icon: 'pause' } : null,
      hasTransition('Resolved') ? { label: 'Resolve Ticket', status: 'Resolved', icon: 'check', primary: true } : null,
    ].filter(Boolean);
  }

  if (status === 'Waiting for User' || status === 'Waiting for Parts') {
    return hasTransition('In Progress') ? [{ label: 'Resume Work', status: 'In Progress', icon: 'play', primary: true }] : [];
  }

  return transitions.map((nextStatus) => ({
    label: nextStatus,
    status: nextStatus,
  }));
}


function mapAttachment(attachment) {
  return {
    id: attachment.attachment_id,
    fileName: attachment.file_name,
    mimeType: attachment.mime_type,
    caption: attachment.file_name,
    altText: attachment.file_name,
    sizeLabel: formatBytes(attachment.file_size_bytes),
  };
}

export function TechnicianTicketExecution({
  ticket,
  onStatusSubmit,
  onCommentSubmit,
  onAttachmentUpload,
  onAttachmentDownload,
  onAttachmentLoad,
  isMutating = false,
}) {
  const [note, setNote] = useState('');
  const [noteInternal, setNoteInternal] = useState(true);
  const [resolution, setResolution] = useState({
    time_spent_minutes: '',
    root_cause: '',
    resolution: '',
  });

  const statusActions = buildTechnicianStatusActions(ticket);
  const canResolve = statusActions.some((action) => action.status === 'Resolved');
  const mappedAttachments = (ticket.attachments || []).map(mapAttachment);
  const imageAttachments = mappedAttachments.filter((attachment) => isSupportedImageType(attachment.mimeType));
  const otherAttachments = mappedAttachments.filter((attachment) => !isSupportedImageType(attachment.mimeType));
  const imageSlotsRemaining = Math.max(0, MAX_TICKET_IMAGES - imageAttachments.length);

  async function submitStatus(action) {
    const status = action.status;
    await onStatusSubmit({
      status,
      note: note.trim() || action.note || '',
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

  async function addEvidenceImages(files) {
    if (files.length > imageSlotsRemaining) return;
    try {
      for (const file of files) {
        await onAttachmentUpload({ file, is_internal: true });
      }
    } catch {
      // The work-item hook exposes the upload error in the page error state.
    }
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

      <section className="technician-execution-grid responsive-detail-grid">
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
            <div className="technician-execution-status-actions responsive-action-grid">
              {statusActions.map((action) => (
                <Button
                  key={action.status}
                  className="ui-button-with-icon"
                  variant={action.primary ? 'primary' : 'secondary'}
                  disabled={isMutating}
                  onClick={() => submitStatus(action)}
                >
                  {action.icon ? <AppIcon name={action.icon} /> : null}
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
                <small>{noteInternal ? 'Internal notes are visible to authorized ICT users.' : 'Public comments are visible on the ticket thread.'}</small>
                <Button size="sm" type="submit" disabled={isMutating || !note.trim()}>
                  {noteInternal ? 'Add Note' : 'Add Comment'}
                </Button>
              </div>
            </form>
          </article>

          <article className="technician-execution-card">
            <div className="technician-execution-card-head">
              <h3>Evidence Images</h3>
            </div>
            <ImageGallery
              title="Image evidence"
              emptyTitle="No evidence images yet."
              emptyDescription="Add screenshots or photos captured while working on this ticket."
              items={imageAttachments}
              loadImage={onAttachmentLoad}
              onDownload={(attachment) => onAttachmentDownload(attachment.id, attachment.fileName)}
              onAddImages={ticket.permissions?.can_manage_attachments ? addEvidenceImages : undefined}
              remainingSlots={imageSlotsRemaining}
              isAdding={isMutating}
            />
            <div className="technician-execution-file-list">
              {otherAttachments.map((attachment) => (
                <button
                  type="button"
                  key={attachment.id}
                  onClick={() => onAttachmentDownload(attachment.id, attachment.fileName)}
                >
                  <span>{attachment.fileName}</span>
                  <small>{attachment.sizeLabel}</small>
                </button>
              ))}
            </div>
          </article>

          {canResolve ? (
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
          ) : null}
        </div>
      </section>
    </div>
  );
}
