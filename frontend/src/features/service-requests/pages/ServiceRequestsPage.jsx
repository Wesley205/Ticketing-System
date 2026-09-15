import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useTicketDetail } from '../hooks/useTicketDetail.js';
import { useTickets } from '../hooks/useTickets.js';
import { ServiceRequestCommandBar } from '../components/ServiceRequestCommandBar.jsx';
import { ServiceRequestPreview } from '../components/ServiceRequestPreview.jsx';
import { ServiceRequestQueue } from '../components/ServiceRequestQueue.jsx';
import { TicketAssignmentModal } from '../components/TicketAssignmentModal.jsx';
import { TicketCreateModal } from '../components/TicketCreateModal.jsx';
import { assignTicket as saveAssignment, isOperationalServiceDeskRole, technicianWorkloadCounts } from '../services/service-requests-api.js';

export function ServiceRequestsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  const selectedTicketId = searchParams.get('ticket');
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

  function handleSelectTicket(ticket) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('ticket', ticket.request_id);
    setSearchParams(nextParams);
  }

  function handleClearFilters() {
    ticketsState.clearFilters();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('ticket');
    setSearchParams(nextParams);
  }

  return (
    <SecureWorkspaceLayout title="Service requests" subtitle={isOperational ? 'ICT Service Desk' : 'ICT Service Hub'}>
      <section className="service-desk-secure-head">
        <div>
          <h2>Service requests</h2>
          <p>{isOperational ? 'Triage, assign, and resolve ICT support work.' : 'Submit and track your ICT support requests.'}</p>
        </div>
        <div className="service-desk-secure-actions">
          <Button variant="secondary" onClick={() => ticketsState.loadTickets(ticketsState.filters)}>Refresh</Button>
          <Button onClick={() => setCreateOpen(true)}>{isOperational ? 'New ticket' : 'Request help'}</Button>
        </div>
      </section>

      <ServiceRequestCommandBar
        filters={ticketsState.filters}
        metadata={ticketsState.metadata}
        isOperational={isOperational}
        onChange={ticketsState.updateFilter}
        onClear={handleClearFilters}
      />

      {ticketsState.error ? <ErrorState title="Ticket list unavailable" description={ticketsState.error} onRetry={() => ticketsState.loadTickets(ticketsState.filters)} /> : null}

      <section className="service-desk-secure-grid">
        <div className="service-desk-secure-panel">
          <div className="service-desk-secure-panel-head">
            <h3>{isOperational ? 'Operational queue' : 'Submitted requests'}</h3>
            <span>{ticketsState.totalTickets} tickets</span>
          </div>
          {ticketsState.isLoading ? (
            <LoadingState variant="table" description="Loading service-request records..." />
          ) : (
            <ServiceRequestQueue
              tickets={ticketsState.tickets}
              selectedTicketId={selectedTicketId}
              canManageAssignments={canManageAssignments}
              pagination={ticketsState.pagination}
              totalTickets={ticketsState.totalTickets}
              onSelect={handleSelectTicket}
              onAssign={handleAssignOpen}
              onCreate={() => setCreateOpen(true)}
              onPrevious={() => ticketsState.setPage(ticketsState.pagination.page - 1)}
              onNext={() => ticketsState.setPage(ticketsState.pagination.page + 1)}
            />
          )}
        </div>

        <aside>
          {detailState.error ? (
            <ErrorState title="Ticket detail unavailable" description={detailState.error} onRetry={detailState.refresh} />
          ) : detailState.isLoading ? (
            <LoadingState variant="detail" description="Loading ticket detail..." />
          ) : detailState.ticket ? (
            <ServiceRequestPreview
              ticket={detailState.ticket}
              isAdmin={auth.user?.role === 'admin'}
              isOperational={isOperational}
              onAssignOpen={() => handleAssignOpen(detailState.ticket)}
              onStatusSubmit={async (payload) => {
                await detailState.updateStatus(payload);
                await ticketsState.loadTickets(ticketsState.filters);
                showToast({ tone: 'success', title: 'Status updated' });
              }}
              isMutating={detailState.isMutating}
            />
          ) : (
            <EmptyState variant="search" title="Select a ticket" description="Choose a request to inspect its latest operational state." />
          )}
        </aside>
      </section>

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
