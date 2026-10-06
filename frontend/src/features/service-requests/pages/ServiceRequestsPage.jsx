import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../../../components/forms/Button.jsx";
import { AppIcon } from "../../../components/icons/AppIcon.jsx";
import { ErrorState } from "../../../components/feedback/ErrorState.jsx";
import { LoadingState } from "../../../components/feedback/LoadingState.jsx";
import { SecureWorkspaceLayout } from "../../../components/layout/SecureWorkspaceLayout.jsx";
import { useToast } from "../../../hooks/useToast.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { useTickets } from "../hooks/useTickets.js";
import { ServiceRequestCommandBar } from "../components/ServiceRequestCommandBar.jsx";
import { ServiceRequestQueue } from "../components/ServiceRequestQueue.jsx";
import { OperationalQueueViews } from "../components/OperationalQueueViews.jsx";
import { TicketCreateModal } from "../components/TicketCreateModal.jsx";
import {
  isOperationalServiceDeskRole,
} from "../services/service-requests-api.js";

export function ServiceRequestsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const isTechnician = auth.user?.role === "technician";
  const isOperational = isOperationalServiceDeskRole(auth.user?.role);

  const ticketsState = useTickets({ role: auth.user?.role, userId: auth.user?.user_id });
  const shouldShowMine =
    searchParams.get("mine") === "1" ||
    searchParams.get("mine") === "true" ||
    !isOperational;

  useEffect(() => {
    if (shouldShowMine && !ticketsState.filters.mine)
      ticketsState.updateFilter("mine", true);
  }, [shouldShowMine, ticketsState.filters.mine]);

  if (isTechnician) {
    return <Navigate to="/technician/assigned-work" replace />;
  }

  async function handleCreated(created) {
    setCreateOpen(false);
    showToast({
      tone: "success",
      title: "Request submitted",
      message: `${created.ticket_number || `#${created.request_id}`} was submitted successfully.`,
    });
    navigate(`/service-requests/${created.request_id}`);
  }

  function handleSelectTicket(ticket) {
    navigate(`/service-requests/${ticket.request_id}`);
  }

  function handleClearFilters() {
    ticketsState.clearFilters();
  }

  return (
    <SecureWorkspaceLayout
      title="Service requests"
      subtitle={isOperational ? "ICT Service Desk" : "ICT Service Hub"}
    >
      <section className="service-desk-secure-head">
        <div>
          <h2>Service requests</h2>
          <p>
            {isOperational
              ? "Triage, assign, and resolve ICT support work."
              : "Submit and track your ICT support requests."}
          </p>
        </div>
        <div className="service-desk-secure-actions">
          <Button
            variant="secondary"
            className="ui-button-with-icon"
            onClick={() => ticketsState.loadTickets(ticketsState.filters)}
          >
            <AppIcon name="refresh" />
            Refresh
          </Button>
          <Button className="ui-button-with-icon" onClick={() => setCreateOpen(true)}>
            <AppIcon name="plus" />
            {isOperational ? "New ticket" : "Request help"}
          </Button>
        </div>
      </section>

      <ServiceRequestCommandBar
        filters={ticketsState.filters}
        metadata={ticketsState.metadata}
        isOperational={isOperational}
        onChange={ticketsState.updateFilter}
        onClear={handleClearFilters}
      />

      {isOperational ? (
        <OperationalQueueViews
          value={ticketsState.filters.queue}
          onChange={(value) => ticketsState.updateFilter("queue", value)}
        />
      ) : null}

      {ticketsState.error ? (
        <ErrorState
          title="Ticket list unavailable"
          description={ticketsState.error}
          onRetry={() => ticketsState.loadTickets(ticketsState.filters)}
        />
      ) : null}

      <section className="service-desk-secure-grid">
        <div className="service-desk-secure-panel">
          <div className="service-desk-secure-panel-head">
            <h3>
              {isOperational ? "Operational queue" : "Submitted requests"}
            </h3>
            <span>{ticketsState.totalTickets} {ticketsState.totalTickets === 1 ? "ticket" : "tickets"}</span>
          </div>
          {ticketsState.isLoading ? (
            <LoadingState
              variant="table"
              description="Loading service-request records..."
            />
          ) : (
            <ServiceRequestQueue
              tickets={ticketsState.tickets}
              pagination={ticketsState.pagination}
              totalTickets={ticketsState.totalTickets}
              onSelect={handleSelectTicket}
              onCreate={() => setCreateOpen(true)}
              onPrevious={() =>
                ticketsState.setPage(ticketsState.pagination.page - 1)
              }
              onNext={() =>
                ticketsState.setPage(ticketsState.pagination.page + 1)
              }
            />
          )}
        </div>
      </section>

      <TicketCreateModal
        open={createOpen}
        metadata={ticketsState.metadata}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        onSubmit={ticketsState.submitCreateTicket}
        isSubmitting={ticketsState.isSubmitting}
      />
    </SecureWorkspaceLayout>
  );
}
