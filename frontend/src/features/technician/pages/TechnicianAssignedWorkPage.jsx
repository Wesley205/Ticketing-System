import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../../../components/forms/Button.jsx";
import { EmptyState } from "../../../components/feedback/EmptyState.jsx";
import { ErrorState } from "../../../components/feedback/ErrorState.jsx";
import { LoadingState } from "../../../components/feedback/LoadingState.jsx";
import { PriorityBadge } from "../../../components/status/PriorityBadge.jsx";
import { StatusBadge } from "../../../components/status/StatusBadge.jsx";
import { formatDateTime } from "../../../lib/formatting.js";
import { useToast } from "../../../hooks/useToast.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { TicketCreateModal } from "../../service-requests/components/TicketCreateModal.jsx";
import { createTicket } from "../../service-requests/services/service-requests-api.js";
import { TechnicianDashboardLayout } from "../components/TechnicianDashboardLayout.jsx";
import { useTechnicianWork } from "../hooks/useTechnicianWork.js";
import { filterWorkByTab } from "../services/technician-api.js";

const metadata = {
  priorities: ["Low", "Medium", "High", "Critical"],
  ticket_types: [
    "Incident",
    "Service Request",
    "Access Request",
    "Maintenance Request",
    "Change Request",
  ],
};

function statusTabCount(workState, tab) {
  return (
    filterWorkByTab(workState.tickets, tab).length +
    filterWorkByTab(workState.maintenance, tab).length
  );
}

function TicketTable({ tickets }) {
  if (!tickets.length) {
    return (
      <EmptyState
        variant="requests"
        title="No assigned tickets in this queue."
        description="Assigned requests that match the current filters will appear here."
        actionLabel="Create Ticket"
        actionTo="/service-requests"
      />
    );
  }

  return (
    <div className="technician-dashboard-table-wrap">
      <table className="technician-dashboard-table">
        <thead>
          <tr>
            <th>Ticket ID</th>
            <th>Subject</th>
            <th>Priority</th>
            <th>Status</th>
            <th>SLA Remaining</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.request_id}>
              <td>
                <Link to={`/technician/work/ticket/${ticket.request_id}`}>
                  {ticket.ticket_number || `#${ticket.request_id}`}
                </Link>
              </td>
              <td>{ticket.subject || "Assigned request"}</td>
              <td>
                <PriorityBadge value={ticket.priority} />
              </td>
              <td>
                <StatusBadge value={ticket.status} />
              </td>
              <td
                className={
                  ticket.slaLabel?.includes("overdue")
                    ? "technician-dashboard-overdue-text"
                    : ""
                }
              >
                {ticket.slaLabel || "Not scheduled"}
              </td>
              <td><Link className="technician-dashboard-view-link" to={`/technician/work/ticket/${ticket.request_id}`}>View work</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceTable({ rows }) {
  if (!rows.length) {
    return (
      <EmptyState
        title="No maintenance tasks in this queue."
        description="Assigned preventive maintenance records will appear here."
        actionLabel="View Maintenance"
        actionTo="/maintenance"
      />
    );
  }

  return (
    <div className="technician-dashboard-table-wrap">
      <table className="technician-dashboard-table">
        <thead>
          <tr>
            <th>Target Asset</th>
            <th>Work</th>
            <th>SLA / due</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((record) => (
            <tr key={record.maintenance_id}>
              <td>
                <Link
                  to={`/technician/work/maintenance/${record.maintenance_id}`}
                >
                  {record.asset_tag || `Asset #${record.asset_id || "-"}`}
                </Link>
              </td>
              <td>
                {record.problem || record.maintenance_type || "Maintenance task"}
              </td>
              <td className={new Date(record.next_due_at || record.scheduled_start_at || record.maintenance_date) < new Date() ? "technician-dashboard-overdue-text" : ""}>
                {new Date(record.next_due_at || record.scheduled_start_at || record.maintenance_date) < new Date() ? "Overdue" : formatDateTime(record.next_due_at || record.scheduled_start_at || record.maintenance_date)}
              </td>
              <td>
                <StatusBadge value={record.status} />
              </td>
              <td><Link className="technician-dashboard-view-link" to={`/technician/work/maintenance/${record.maintenance_id}`}>View work</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TechnicianAssignedWorkPage() {
  const auth = useAuth();
  const workState = useTechnicianWork();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);

  const visibleTickets = useMemo(() => {
    const labels = new Map(
      workState.dashboard.priorityQueue.map((ticket) => [
        ticket.request_id,
        ticket.slaLabel,
      ]),
    );
    return workState.visibleTickets.map((ticket) => ({
      ...ticket,
      slaLabel: labels.get(ticket.request_id) || ticket.slaLabel,
    }));
  }, [workState.dashboard.priorityQueue, workState.visibleTickets]);

  async function handleCreated(created) {
    setCreateOpen(false);
    showToast({
      tone: "success",
      title: "Request submitted",
      message: `${created.ticket_number || `#${created.request_id}`} was created successfully.`,
    });
    navigate(`/technician/work/ticket/${created.request_id}`);
  }

  return (
    <TechnicianDashboardLayout>
      <section className="technician-assigned-head">
        <div>
          <h2>Assigned work</h2>
          <p>
            Review and complete tickets and maintenance tasks assigned to you.
          </p>
          <span className="technician-floor-context">Assigned floor: {auth.user?.floor_label || 'Not set'}</span>
        </div>
        <div className="technician-assigned-tools">
          <Button size="sm" onClick={() => setCreateOpen(true)}>Create Ticket</Button>
        </div>
      </section>

      <section
        className="technician-assigned-tabs"
        aria-label="Assigned work status filters"
      >
        {[
          ["active", "Active"],
          ["pending_resolution", "Pending Resolution"],
          ["completed", "Completed"],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant={workState.filters.tab === key ? "primary" : "secondary"}
            size="sm"
            onClick={() => workState.updateFilter("tab", key)}
          >
            {label} {statusTabCount(workState, key)}
          </Button>
        ))}
        {/* <span className="technician-assigned-alert">Department record: read-only mode outside assigned work</span> */}
      </section>

      {workState.error ? (
        <ErrorState
          title="Assigned work unavailable"
          description={workState.error}
          onRetry={() => workState.refresh(workState.filters)}
        />
      ) : null}
      {workState.isLoading ? (
        <LoadingState variant="table" description="Loading assigned work..." />
      ) : null}

      <section className="technician-dashboard-section">
        <div className="technician-dashboard-section-head">
          <h2>Assigned tickets</h2>
          <span>
            Execute and log transition states immediately upon action.
          </span>
        </div>
        <TicketTable tickets={visibleTickets} />
      </section>

      <section className="technician-dashboard-section">
        <div className="technician-dashboard-section-head">
          <h2>Assigned maintenance</h2>
          <span>Scheduled diagnostics and terminal auditing.</span>
        </div>
        <MaintenanceTable rows={workState.visibleMaintenance} />
      </section>

      <TicketCreateModal
        open={createOpen}
        metadata={metadata}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
        onSubmit={createTicket}
        isSubmitting={false}
      />
    </TechnicianDashboardLayout>
  );
}
