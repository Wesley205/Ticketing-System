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
import { TicketApprovalPanel } from './TicketApprovalPanel.jsx';
import { ticketId } from './service-request-formatters.js';
import { SlaIndicator } from './SlaIndicator.jsx';

const REQUESTER_STATUS_COPY = {
  New: ['Request received', 'ICT has received your request and will review it.'],
  Pending: ['Under review', 'Your request is waiting for triage or approval.'],
  Assigned: ['Assigned to ICT', 'A technician has been assigned to your request.'],
  Accepted: ['Work acknowledged', 'The assigned technician has accepted the request.'],
  'In Progress': ['Work in progress', 'ICT is actively working on your request.'],
  'Waiting for User': ['Action needed', 'ICT needs information or action from you.'],
  'Waiting for Parts': ['Waiting for resources', 'Work will continue when the required parts are available.'],
  Resolved: ['Resolution ready', 'Review the resolution and confirm whether the request can be closed.'],
  Closed: ['Request closed', 'This request has been completed.'],
  Reopened: ['Request reopened', 'ICT will review the issue again.'],
  Cancelled: ['Request cancelled', 'This request will not proceed.'],
};

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
  onAttachmentLoad,
  onAssetSave,
  onApprovalSubmit,
  isMutating = false,
}) {
  const canAssign = Boolean(ticket.permissions?.can_assign);
  const canEditAsset = isOperational && Boolean(onAssetSave);
  const requesterStatus = REQUESTER_STATUS_COPY[ticket.status] || [ticket.status, 'Check the activity history for the latest update.'];

  return (
    <div className="service-request-detail-layout responsive-detail-grid">
      <main className="service-request-detail-main">
        <header className="service-request-detail-header">
          <Link to="/service-requests" className="service-request-back-link">Back to service desk</Link>
          <div className="service-request-detail-title">
            <div>
              <strong>{ticketId(ticket)}</strong>
              <h2>{ticket.subject || 'Untitled request'}</h2>
            </div>
            <div className="ui-inline-actions responsive-action-row">
              <StatusBadge value={ticket.status} />
              <PriorityBadge value={ticket.priority} />
              <span className="service-request-title-sla"><SlaIndicator ticket={ticket} /></span>
            </div>
          </div>
        </header>

        {!isOperational ? (
          <section className="requester-status-summary" aria-live="polite">
            <span>Current progress</span>
            <strong>{requesterStatus[0]}</strong>
            <p>{requesterStatus[1]}</p>
          </section>
        ) : null}

        <TicketApprovalPanel ticket={ticket} onDecision={onApprovalSubmit} isSubmitting={isMutating} />

        <section className="service-request-detail-section">
          <h3>Description</h3>
          <p>{ticket.description || 'No description provided.'}</p>
          {Object.keys(ticket.catalog_responses || {}).length ? (
            <dl className="service-request-definition-list ticket-catalog-responses">
              {Object.entries(ticket.catalog_responses).map(([key, value]) => (
                <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>
              ))}
            </dl>
          ) : null}
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
          <h3>Public comments and internal notes</h3>
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
            onLoadImage={onAttachmentLoad}
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
          <h3>Activity history</h3>
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
            <div><dt>Floor</dt><dd>{ticket.floor_label || '-'}</dd></div>
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
            <div><dt>Service</dt><dd>{ticket.catalog_item_name || ticket.subcategory || 'General support'}</dd></div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
