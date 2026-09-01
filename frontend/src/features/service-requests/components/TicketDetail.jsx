import { Button } from '../../../components/forms/Button.jsx';
import { DetailPanel } from '../../../components/status/DetailPanel.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { KBSuggestions } from './KBSuggestions.jsx';
import { TicketAttachments } from './TicketAttachments.jsx';
import { TicketCommentsThread } from './TicketCommentsThread.jsx';
import { TicketHistoryTimeline } from './TicketHistoryTimeline.jsx';
import { TicketStatusUpdate } from './TicketStatusUpdate.jsx';

export function TicketDetail({
  ticket,
  suggestions = [],
  assets = [],
  onAssetSave,
  onAssignOpen,
  onStatusSubmit,
  onCommentSubmit,
  onAttachmentUpload,
  onAttachmentDownload,
  isMutating = false,
  allowAssetEditing = true,
  showWorkflow = true,
}) {
  if (!ticket) {
    return (
      <DetailPanel title="Ticket Detail">
        <p className="react-copy">
          Select a ticket to view its timeline, comments, notes, attachments, and SLA context.
        </p>
      </DetailPanel>
    );
  }

  return (
    <div className="ui-stack-lg">
      <DetailPanel
        title={`${ticket.ticket_number || `#${ticket.request_id}`} - ${ticket.subject}`}
        aside={(
          <div className="ui-inline-actions">
            <StatusBadge value={ticket.status} />
            <PriorityBadge value={ticket.priority} />
            <span className="ui-chip">{ticket.ticket_type || 'Incident'}</span>
          </div>
        )}
      >
        <div className="ticket-kpi-grid">
          <div className="ticket-kpi-card"><span>Requester</span><strong>{ticket.requester_name || '-'}</strong></div>
          <div className="ticket-kpi-card"><span>Technician</span><strong>{ticket.technician_name || 'Unassigned'}</strong></div>
          <div className="ticket-kpi-card"><span>Department</span><strong>{ticket.department_name || '-'}</strong></div>
          <div className="ticket-kpi-card"><span>Created</span><strong>{formatDateTime(ticket.date_submitted)}</strong></div>
          <div className="ticket-kpi-card"><span>Expected Completion</span><strong>{formatDateTime(ticket.expected_completion_at)}</strong></div>
          <div className="ticket-kpi-card"><span>Escalations</span><strong>{ticket.sla?.escalation_count || 0}</strong></div>
        </div>

        <div className="ticket-meta-grid">
          <div><strong>Category</strong><span>{ticket.category || '-'}{ticket.subcategory ? ` / ${ticket.subcategory}` : ''}</span></div>
          <div><strong>Impact / Urgency</strong><span>{ticket.impact || '-'} / {ticket.urgency || '-'}</span></div>
          <div><strong>Source Channel</strong><span>{ticket.source_channel || '-'}</span></div>
          <div><strong>Affected Asset</strong><span>{ticket.affected_asset_tag || (ticket.affected_asset_id ? `Asset #${ticket.affected_asset_id}` : '-')}</span></div>
          <div><strong>First Response</strong><span>{formatDateTime(ticket.first_response_at)}</span></div>
          <div><strong>Resolution Due</strong><span>{formatDateTime(ticket.sla_resolution_due_at)}</span></div>
          <div><strong>Response Due</strong><span>{formatDateTime(ticket.sla_response_due_at)}</span></div>
          <div><strong>Assigned By</strong><span>{ticket.assigned_by_name || '-'}</span></div>
        </div>

        <section className="ticket-block">
          <strong>Description</strong>
          <p className="react-copy">{ticket.description}</p>
        </section>

        <section className="ticket-block">
          <div className="ui-panel-head">
            <h3>Asset Link</h3>
            {ticket.permissions?.can_assign ? (
              <Button size="sm" onClick={onAssignOpen}>
                {ticket.assigned_technician_id ? 'Reassign Technician' : 'Assign Technician'}
              </Button>
            ) : null}
          </div>
          {allowAssetEditing ? (
            <div className="ticket-inline-grid">
              <select
                className="ui-input"
                defaultValue={ticket.affected_asset_id || ''}
                id="ticket-detail-asset-select"
              >
                <option value="">No linked asset</option>
                {assets.map((asset) => (
                  <option key={asset.asset_id} value={asset.asset_id}>
                    {asset.asset_tag} - {asset.asset_type}
                  </option>
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
                  Save Asset Link
                </Button>
              </div>
            </div>
          ) : (
            <p className="react-copy">
              {ticket.affected_asset_tag || (ticket.affected_asset_id ? `Asset #${ticket.affected_asset_id}` : 'No linked asset')}
            </p>
          )}
        </section>

        {suggestions.length ? (
          <section className="ticket-block">
            <strong>Suggested Knowledge Articles</strong>
            <KBSuggestions suggestions={suggestions} />
          </section>
        ) : null}

        {showWorkflow ? (
          <section className="ticket-block">
            <strong>Workflow</strong>
            <TicketStatusUpdate
              allowedStatuses={ticket.permissions?.allowed_status_transitions || []}
              canUpdate={ticket.permissions?.can_update_status}
              onSubmit={onStatusSubmit}
              isSubmitting={isMutating}
            />
          </section>
        ) : null}

        <section className="ticket-block">
          <strong>SLA And Ownership</strong>
          <div className="ticket-meta-grid">
            <div><strong>SLA Policy</strong><span>{ticket.sla?.policy_name || 'Unmapped'}</span></div>
            <div><strong>Response Overdue</strong><span>{ticket.sla?.responseOverdue ? 'Yes' : 'No'}</span></div>
            <div><strong>Resolution Overdue</strong><span>{ticket.sla?.resolutionOverdue ? 'Yes' : 'No'}</span></div>
            <div><strong>Expected Completion Overdue</strong><span>{ticket.sla?.expectedCompletionOverdue ? 'Yes' : 'No'}</span></div>
          </div>
        </section>

        <section className="ticket-block">
          <strong>Assignment History</strong>
          <TicketHistoryTimeline history={(ticket.assignment_history || []).map((entry) => ({
            history_id: entry.assignment_id || entry.assigned_at,
            event_type: `Assigned to ${entry.technician_name || 'Unassigned'}`,
            details: `Assigned by ${entry.assigned_by_name || 'System'}${entry.assignment_notes ? ` | ${entry.assignment_notes}` : ''}`,
            created_at: entry.assigned_at,
          }))} />
        </section>

        <section className="ticket-block">
          <strong>Comments And Notes</strong>
          <TicketCommentsThread
            comments={ticket.comments || []}
            canComment={ticket.permissions?.can_add_comment}
            canAddInternalNote={ticket.permissions?.can_add_internal_note}
            onSubmit={onCommentSubmit}
            isSubmitting={isMutating}
          />
        </section>

        <section className="ticket-block">
          <strong>Attachments</strong>
          <TicketAttachments
            attachments={ticket.attachments || []}
            canUpload={ticket.permissions?.can_manage_attachments}
            canAddInternal={ticket.permissions?.can_add_internal_note}
            onUpload={onAttachmentUpload}
            onDownload={onAttachmentDownload}
            isSubmitting={isMutating}
          />
        </section>

        <section className="ticket-block">
          <strong>Timeline</strong>
          <TicketHistoryTimeline history={ticket.history || []} />
        </section>
      </DetailPanel>
    </div>
  );
}
