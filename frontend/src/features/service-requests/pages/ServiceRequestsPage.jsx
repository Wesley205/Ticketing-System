import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { Pagination } from '../../../components/tables/Pagination.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useTicketDetail } from '../hooks/useTicketDetail.js';
import { useTickets } from '../hooks/useTickets.js';
import { TicketAssignmentModal } from '../components/TicketAssignmentModal.jsx';
import { TicketCreateModal } from '../components/TicketCreateModal.jsx';
import { TicketFilters } from '../components/TicketFilters.jsx';
import { TicketList } from '../components/TicketList.jsx';
import { OperationalTicketDetail } from '../components/OperationalTicketDetail.jsx';
import { RequesterTicketDetail } from '../components/RequesterTicketDetail.jsx';
import { assignTicket as saveAssignment, isOperationalServiceDeskRole, technicianWorkloadCounts } from '../services/service-requests-api.js';

export function ServiceRequestsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentTicket, setAssignmentTicket] = useState(null);
  const isTechnician = auth.user?.role === 'technician';
  const isOperational = isOperationalServiceDeskRole(auth.user?.role);

  const ticketsState = useTickets({ role: auth.user?.role });
  const shouldShowMine = searchParams.get('mine') === '1' || searchParams.get('mine') === 'true' || !isOperational;

  useEffect(() => {
    if (shouldShowMine && !ticketsState.filters.mine) ticketsState.updateFilter('mine', true);
  }, [shouldShowMine, ticketsState.filters.mine]);

  const selectedTicketId = useMemo(() => ticketsState.tickets[0]?.request_id || null, [ticketsState.tickets]);
  const detailState = useTicketDetail(selectedTicketId);
  const canManageAssignments = auth.accessProfile?.permissions?.can_manage_service_request_assignments === true;
  const workloadCounts = useMemo(() => technicianWorkloadCounts(ticketsState.tickets), [ticketsState.tickets]);

  if (isTechnician) {
    return <Navigate to="/technician/assigned-work" replace />;
  }

  async function handleCreated(created) {
    setCreateOpen(false);
    showToast({ tone: 'success', title: 'Request submitted', message: `${created.ticket_number || `#${created.request_id}`} was submitted successfully.` });
    navigate(`/service-requests/${created.request_id}`);
  }

  function handleAssignOpen(ticket) {
    setAssignmentTicket(ticket);
    setAssignmentOpen(true);
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
    <SecureWorkspaceLayout title={isOperational ? 'ICT Service Desk Workspace' : 'Staff Access Portal'} subtitle={isOperational ? 'ICT Security Mode' : 'ICT Service Hub'}>
      <section className="service-desk-secure-head">
        <div>
          <h2>{isOperational ? 'Service Desk Operations' : 'My Requests'}</h2>
          <p>{isOperational ? 'Monitor, triage, and route active national security council support incidents.' : 'Track submitted requests, send messages, and confirm completed work.'}</p>
        </div>
        <div className="service-desk-secure-actions">
          <Button variant="secondary" onClick={() => ticketsState.loadTickets(ticketsState.filters)}>Refresh</Button>
          <Button onClick={() => setCreateOpen(true)}>{isOperational ? 'New Ticket' : 'Request help'}</Button>
        </div>
      </section>

      <section className="service-desk-secure-filters">
        <TicketFilters filters={ticketsState.filters} metadata={ticketsState.metadata} onChange={ticketsState.updateFilter} />
      </section>

      {ticketsState.error ? <ErrorState title="Ticket list unavailable" description={ticketsState.error} onRetry={() => ticketsState.loadTickets(ticketsState.filters)} /> : null}

      <section className="service-desk-secure-grid">
        <div className="service-desk-secure-panel">
          <div className="service-desk-secure-panel-head">
            <h3>{isOperational ? 'Operational Queue' : 'Submitted Requests'}</h3>
            <span>{ticketsState.totalTickets} tickets</span>
          </div>
          {ticketsState.isLoading ? (
            <LoadingState variant="table" description="Loading service-request records..." />
          ) : (
            <div className="ui-stack-md">
              <TicketList tickets={ticketsState.tickets} canManageAssignments={canManageAssignments} onAssign={handleAssignOpen} />
              <Pagination
                page={ticketsState.pagination.page}
                totalPages={ticketsState.pagination.totalPages}
                onPrevious={() => ticketsState.setPage(ticketsState.pagination.page - 1)}
                onNext={() => ticketsState.setPage(ticketsState.pagination.page + 1)}
              />
            </div>
          )}
        </div>

        <aside>
          {detailState.error ? (
            <ErrorState title="Ticket detail unavailable" description={detailState.error} onRetry={detailState.refresh} />
          ) : detailState.isLoading ? (
            <LoadingState variant="detail" description="Loading ticket detail..." />
          ) : detailState.ticket ? (
            isOperational ? (
              <OperationalTicketDetail
                ticket={detailState.ticket}
                isAdmin={auth.user?.role === 'admin'}
                onAssignOpen={() => handleAssignOpen(detailState.ticket)}
                onStatusSubmit={async (payload) => {
                  await detailState.updateStatus(payload);
                  showToast({ tone: 'success', title: 'Status updated' });
                }}
                onCommentSubmit={async (payload) => {
                  await detailState.addComment(payload);
                  showToast({ tone: 'success', title: 'Internal note posted' });
                }}
              />
            ) : (
              <RequesterTicketDetail
                ticket={detailState.ticket}
                onStatusSubmit={async (payload) => {
                  await detailState.updateStatus(payload);
                  showToast({ tone: 'success', title: 'Request updated' });
                }}
                onCommentSubmit={async (payload) => {
                  await detailState.addComment(payload);
                  showToast({ tone: 'success', title: 'Message sent' });
                }}
                onAttachmentDownload={handleDownloadAttachment}
              />
            )
          ) : (
            <EmptyState variant="search" title="Select a ticket" description="Choose a request to inspect its latest operational state." />
          )}
        </aside>
      </section>

      <footer className="notification-secure-footer">
        <span>National Security Council ICT Department. Secure internal infrastructure.</span>
        <small>NODE: NSC-AUTH-PR00-09 // LATENCY: 14ms // ROLE: SERVICE_DESK</small>
      </footer>

      <TicketCreateModal open={createOpen} metadata={ticketsState.metadata} onClose={() => setCreateOpen(false)} onCreated={handleCreated} onSubmit={ticketsState.submitCreateTicket} isSubmitting={ticketsState.isSubmitting} />

      <TicketAssignmentModal
        open={assignmentOpen}
        ticket={assignmentTicket}
        technicians={detailState.technicians}
        workloadCounts={workloadCounts}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={async (payload) => {
          await saveAssignment(assignmentTicket.request_id, payload);
          await ticketsState.loadTickets(ticketsState.filters);
          await detailState.refresh();
          showToast({ tone: 'success', title: 'Assignment saved' });
        }}
      />
    </SecureWorkspaceLayout>
  );
}
