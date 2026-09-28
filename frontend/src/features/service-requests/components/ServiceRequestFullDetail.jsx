import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { KBSuggestions } from './KBSuggestions.jsx';
import { TicketActionCenter } from './TicketActionCenter.jsx';
import { TicketActivityTimeline } from './TicketActivityTimeline.jsx';
import { TicketAttachments } from './TicketAttachments.jsx';
import { TicketCommentsThread } from './TicketCommentsThread.jsx';
import { ticketId } from './service-request-formatters.js';

export function ServiceRequestFullDetail({
  ticket,
  suggestions = [],
  assets = [],
  isAdmin = false,
  isOperational = false,
  onAssignOpen,
  onStatusSubmit,
  onCommentSubmit,
  onAttachmentUpload,
  onAttachmentDownload,
  onAssetSave,
  isMutating = false,
}) {
  const canAssign = Boolean(ticket.permissions?.can_assign);
  const canEditAsset = isOperational && Boolean(onAssetSave);

  return (
    <div className="service-request-detail-layout responsive-detail-grid">
      <main className="service-request-detail-main">
        <header className="service-request-detail-header">
          <Link to="/service-requests" className="service-request-back-link">Back to requests</Link>
          <div className="service-request-detail-title">
            <div>
              <strong>{ticketId(ticket)}</strong>
              <h2>{ticket.subject || 'Untitled request'}</h2>
            </div>
            <div className="ui-inline-actions responsive-action-row">
              <StatusBadge value={ticket.status} />
              <PriorityBadge value={ticket.priority} />
            </div>
          </div>
        </header>

        <section className="service-request-detail-section">
          <h3>Description</h3>
          <p>{ticket.description || 'No description provided.'}</p>
        </section>

        <section className="service-request-detail-section">
          <h3>Related asset and evidence</h3>
          {canEditAsset ? (
            <div className="ticket-inline-grid">
              <select className="ui-input" defaultValue={ticket.affected_asset_id || ''} id="ticket-detail-asset-select">
                <option value="">No linked asset</option>
                {assets.map((asset) => (
                  <option key={asset.asset_id} value={asset.asset_id}>{asset.asset_tag} - {asset.asset_type}</option>
                ))}
              </select>
              <div className="ticket-status-action">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const element = document.getElementById('ticket-detail-asset-select');
                    onAssetSave({ affected_asset_id: element?.value || null });
                  }}
                  disabled={isMutating}
                >
                  Save asset
                </Button>
              </div>
            </div>
          ) : (
            <p>{ticket.affected_asset_tag || (ticket.affected_asset_id ? `Asset #${ticket.affected_asset_id}` : 'No linked asset')}</p>
          )}
        </section>

        <section className="service-request-detail-section">
          <h3>Communication</h3>
          <TicketCommentsThread
            comments={ticket.comments || []}
            canComment={ticket.permissions?.can_add_comment}
            canAddInternalNote={ticket.permissions?.can_add_internal_note}
            onSubmit={onCommentSubmit}
            isSubmitting={isMutating}
          />
        </section>

        <section className="service-request-detail-section">
          <h3>Attachments</h3>
          <TicketAttachments
            attachments={ticket.attachments || []}
            canUpload={ticket.permissions?.can_manage_attachments}
            canAddInternal={ticket.permissions?.can_add_internal_note}
            onUpload={onAttachmentUpload}
            onDownload={onAttachmentDownload}
            isSubmitting={isMutating}
          />
        </section>

        {suggestions.length ? (
          <section className="service-request-detail-section">
            <h3>Suggested knowledge</h3>
            <KBSuggestions suggestions={suggestions.slice(0, 3)} />
          </section>
        ) : null}

        <section className="service-request-detail-section">
          <h3>Activity</h3>
          <TicketActivityTimeline history={ticket.history || []} limit={12} />
        </section>
      </main>

      <aside className="service-request-detail-context responsive-priority-panel">
        <TicketActionCenter
          ticket={ticket}
          isAdmin={isAdmin}
          canAssign={canAssign}
          onAssignOpen={onAssignOpen}
          onStatusSubmit={onStatusSubmit}
          isMutating={isMutating}
        />

        <section className="service-request-detail-section">
          <h3>Requester and assignment</h3>
          <dl className="service-request-definition-list">
            <div><dt>Requester</dt><dd>{ticket.requester_name || '-'}</dd></div>
            <div><dt>Department</dt><dd>{ticket.department_name || '-'}</dd></div>
            <div><dt>Assignee</dt><dd>{ticket.technician_name || 'Unassigned'}</dd></div>
            <div><dt>Assigned by</dt><dd>{ticket.assigned_by_name || '-'}</dd></div>
          </dl>
        </section>

        <section className="service-request-detail-section">
          <h3>Classification</h3>
          <dl className="service-request-definition-list">
            <div><dt>Type</dt><dd>{ticket.ticket_type || '-'}</dd></div>
            <div><dt>Category</dt><dd>{ticket.category || '-'}{ticket.subcategory ? ` / ${ticket.subcategory}` : ''}</dd></div>
            <div><dt>Impact</dt><dd>{ticket.impact || '-'}</dd></div>
            <div><dt>Urgency</dt><dd>{ticket.urgency || '-'}</dd></div>
            <div><dt>Created</dt><dd>{formatDateTime(ticket.date_submitted)}</dd></div>
            <div><dt>Expected</dt><dd>{formatDateTime(ticket.expected_completion_at)}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
