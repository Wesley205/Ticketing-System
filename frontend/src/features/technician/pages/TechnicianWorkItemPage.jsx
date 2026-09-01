import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { formatDateTime } from '../../../lib/formatting.js';
import { TicketDetail } from '../../service-requests/components/TicketDetail.jsx';
import { TicketHistoryTimeline } from '../../service-requests/components/TicketHistoryTimeline.jsx';
import { WorkExecutionPanel } from '../components/WorkExecutionPanel.jsx';
import { useWorkExecution } from '../hooks/useWorkExecution.js';

export function TechnicianWorkItemPage() {
  const { itemType, itemId } = useParams();
  const { showToast } = useToast();
  const workType = itemType === 'maintenance' ? 'maintenance' : 'ticket';
  const workState = useWorkExecution(workType, itemId);

  async function handleDownloadAttachment(attachmentId, fileName) {
    const blob = await workState.downloadAttachment(attachmentId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 5"
        title={workType === 'maintenance' ? 'Maintenance Work Item' : 'Technician Ticket Detail'}
        description="Focused execution workspace for assigned work only."
        meta={[workType, workState.item?.ticket_number || workState.item?.maintenance_id || itemId]}
      />

      {workState.error ? (
        <ErrorState title="Work item unavailable" description={workState.error} onRetry={workState.refresh} />
      ) : null}

      {workState.isLoading ? (
        <LoadingState description="Loading assigned work item..." />
      ) : !workState.item ? (
        <EmptyState title="Work item not found" description="The selected ticket or maintenance record is not available in your assigned queue." />
      ) : workType === 'ticket' ? (
        <div className="ui-stack-lg">
          <WorkExecutionPanel
            type="ticket"
            item={workState.item}
            onSubmit={async (payload) => {
              await workState.submitTicketStatus(payload);
              showToast({ tone: 'success', title: 'Ticket workflow updated' });
            }}
            isSubmitting={workState.isMutating}
          />
          <TicketDetail
            ticket={workState.item}
            suggestions={[]}
            assets={[]}
            allowAssetEditing={false}
            showWorkflow={false}
            onAssetSave={async () => {}}
            onAssignOpen={() => {}}
            onStatusSubmit={async (payload) => {
              await workState.submitTicketStatus(payload);
              showToast({ tone: 'success', title: 'Ticket status updated' });
            }}
            onCommentSubmit={async (payload) => {
              await workState.addComment(payload);
              showToast({ tone: 'success', title: 'Comment posted' });
            }}
            onAttachmentUpload={async (payload) => {
              await workState.uploadAttachment(payload);
              showToast({ tone: 'success', title: 'Attachment uploaded' });
            }}
            onAttachmentDownload={handleDownloadAttachment}
            isMutating={workState.isMutating}
          />
        </div>
      ) : (
        <div className="ui-stack-lg">
          <WorkExecutionPanel
            type="maintenance"
            item={workState.item}
            onSubmit={async (payload) => {
              await workState.submitMaintenanceUpdate(payload);
              showToast({ tone: 'success', title: 'Maintenance updated' });
            }}
            isSubmitting={workState.isMutating}
          />
          <Panel title={`Maintenance #${workState.item.maintenance_id}`}>
            <div className="ui-stack-md">
              <div className="ticket-meta-grid">
                <div><strong>Status</strong><span>{workState.item.status || '-'}</span></div>
                <div><strong>Asset</strong><span>{workState.item.asset_tag || `Asset #${workState.item.asset_id}`}</span></div>
                <div><strong>Type</strong><span>{workState.item.maintenance_type || '-'}</span></div>
                <div><strong>Technician</strong><span>{workState.item.technician_name || '-'}</span></div>
                <div><strong>Started</strong><span>{formatDateTime(workState.item.started_at)}</span></div>
                <div><strong>Completed</strong><span>{formatDateTime(workState.item.completed_at)}</span></div>
              </div>
              <div className="ticket-block">
                <strong>Problem</strong>
                <p className="react-copy">{workState.item.problem || 'No problem statement provided.'}</p>
              </div>
              <div className="ticket-block">
                <strong>Notes</strong>
                <p className="react-copy">{workState.item.notes || 'No additional notes recorded.'}</p>
              </div>
              <div className="ticket-block">
                <strong>Action Taken</strong>
                <p className="react-copy">{workState.item.action_taken || 'No action recorded yet.'}</p>
              </div>
              <div className="ticket-block">
                <strong>Completion Notes</strong>
                <p className="react-copy">{workState.item.completion_notes || 'No completion summary recorded yet.'}</p>
              </div>
              <div className="ticket-block">
                <strong>Timeline</strong>
                <TicketHistoryTimeline history={[
                  {
                    history_id: `maintenance-created-${workState.item.maintenance_id}`,
                    event_type: 'Maintenance created',
                    details: workState.item.problem || 'Maintenance record created.',
                    created_at: workState.item.created_at || workState.item.maintenance_date,
                  },
                  workState.item.started_at ? {
                    history_id: `maintenance-started-${workState.item.maintenance_id}`,
                    event_type: 'Maintenance started',
                    details: workState.item.notes || 'Work execution started.',
                    created_at: workState.item.started_at,
                  } : null,
                  workState.item.completed_at ? {
                    history_id: `maintenance-completed-${workState.item.maintenance_id}`,
                    event_type: 'Maintenance completed',
                    details: workState.item.completion_notes || workState.item.action_taken || 'Maintenance completed.',
                    created_at: workState.item.completed_at,
                  } : null,
                ].filter(Boolean)} />
              </div>
            </div>
          </Panel>
        </div>
      )}

      <div className="ui-inline-actions">
        <Link to="/technician"><Button variant="secondary">Back to technician workspace</Button></Link>
        <a href="/technician"><Button variant="secondary">Back to technician workspace</Button></a>
      </div>
    </div>
  );
}
