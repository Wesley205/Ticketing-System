import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useTicketDetail } from '../hooks/useTicketDetail.js';
import { useTickets } from '../hooks/useTickets.js';
import { TicketAssignmentModal } from '../components/TicketAssignmentModal.jsx';
import { TicketCreateModal } from '../components/TicketCreateModal.jsx';
import { TicketDetail } from '../components/TicketDetail.jsx';
import { TicketFilters } from '../components/TicketFilters.jsx';
import { TicketList } from '../components/TicketList.jsx';
import { assignTicket as saveAssignment } from '../services/service-requests-api.js';

export function ServiceRequestsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentTicket, setAssignmentTicket] = useState(null);

  const ticketsState = useTickets({ role: auth.user?.role });
  const selectedTicketId = useMemo(
    () => ticketsState.tickets[0]?.request_id || null,
    [ticketsState.tickets]
  );
  const detailState = useTicketDetail(selectedTicketId);

  const canManageAssignments = auth.accessProfile?.permissions?.can_manage_service_request_assignments === true;

  function handleAssignOpen(ticket) {
    setAssignmentTicket(ticket);
    setAssignmentOpen(true);
  }

  async function handleCreated(created) {
    setCreateOpen(false);
    showToast({
      tone: 'success',
      title: 'Ticket created',
      message: `${created.ticket_number || `#${created.request_id}`} was submitted successfully.`,
    });
    navigate(`/service-requests/${created.request_id}`);
  }

  async function handleDownloadAttachment(attachmentId, fileName) {
    const blob = await detailState.downloadAttachment(attachmentId);
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
        eyebrow="Phase 4"
        title="Service Desk"
        description="Ticket workflows, assignment, comments, attachments, and history are now available in the React shell."
        meta={[
          auth.accessProfile?.role_label || 'User',
          `${ticketsState.totalTickets} visible tickets`,
        ]}
      />

      <Panel
        title="Ticket Workspace"
        actions={(
          <div className="ui-inline-actions">
            <Button variant="secondary" onClick={() => ticketsState.loadTickets(ticketsState.filters)}>
              Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)}>New Ticket</Button>
          </div>
        )}
      >
        <TicketFilters
          filters={ticketsState.filters}
          metadata={ticketsState.metadata}
          onChange={ticketsState.updateFilter}
        />
      </Panel>

      {ticketsState.error ? (
        <ErrorState
          title="Ticket list unavailable"
          description={ticketsState.error}
          onRetry={() => ticketsState.loadTickets(ticketsState.filters)}
        />
      ) : null}

      <div className="service-grid-react">
        <Panel title="Tickets">
          {ticketsState.isLoading ? (
            <LoadingState description="Loading service-request records..." />
          ) : (
            <div className="ui-stack-md">
              <TicketList
                tickets={ticketsState.tickets}
                canManageAssignments={canManageAssignments}
                onAssign={handleAssignOpen}
              />
              <Pagination
                page={ticketsState.pagination.page}
                totalPages={ticketsState.pagination.totalPages}
                onPrevious={() => ticketsState.setPage(ticketsState.pagination.page - 1)}
                onNext={() => ticketsState.setPage(ticketsState.pagination.page + 1)}
              />
            </div>
          )}
        </Panel>

        <div>
          {detailState.error ? (
            <ErrorState
              title="Ticket detail unavailable"
              description={detailState.error}
              onRetry={detailState.refresh}
            />
          ) : detailState.isLoading ? (
            <LoadingState description="Loading ticket detail..." />
          ) : detailState.ticket ? (
            <TicketDetail
              ticket={detailState.ticket}
              suggestions={detailState.suggestions}
              assets={detailState.assets}
              onAssetSave={async (payload) => {
                await detailState.updateAsset(payload);
                showToast({ tone: 'success', title: 'Asset link updated' });
              }}
              onAssignOpen={() => handleAssignOpen(detailState.ticket)}
              onStatusSubmit={async (payload) => {
                await detailState.updateStatus(payload);
                showToast({ tone: 'success', title: 'Status updated' });
              }}
              onCommentSubmit={async (payload) => {
                await detailState.addComment(payload);
                showToast({ tone: 'success', title: 'Comment posted' });
              }}
              onAttachmentUpload={async (payload) => {
                await detailState.uploadAttachment(payload);
                showToast({ tone: 'success', title: 'Attachment uploaded' });
              }}
              onAttachmentDownload={handleDownloadAttachment}
              isMutating={detailState.isMutating}
            />
          ) : (
            <EmptyState
              title="Select a ticket"
              description="Choose a ticket from the list to inspect the timeline, comments, notes, attachments, and SLA context."
            />
          )}
        </div>
      </div>

      <TicketCreateModal
        open={createOpen}
        metadata={ticketsState.metadata}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        onSubmit={ticketsState.submitCreateTicket}
        isSubmitting={ticketsState.isSubmitting}
      />

      <TicketAssignmentModal
        open={assignmentOpen}
        ticket={assignmentTicket}
        technicians={detailState.technicians}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={async (payload) => {
          await saveAssignment(assignmentTicket.request_id, payload);
          await ticketsState.loadTickets(ticketsState.filters);
          await detailState.refresh();
          showToast({ tone: 'success', title: 'Assignment saved' });
        }}
      />
    </div>
  );
}
