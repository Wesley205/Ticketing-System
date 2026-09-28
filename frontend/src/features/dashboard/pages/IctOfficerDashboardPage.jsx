import { Link } from "react-router-dom";
import { ErrorState } from "../../../components/feedback/ErrorState.jsx";
import { LoadingState } from "../../../components/feedback/LoadingState.jsx";
import { Button } from "../../../components/forms/Button.jsx";
import { fallbackDashboardTickets } from "../services/dashboard-api.js";
import { SecureDashboardMetricCard } from "../components/SecureDashboardCards.jsx";
import { SecureRequestTable } from "../components/SecureDashboardTables.jsx";
import {
  SlaSummaryCards,
  TechnicianCapacityPanel,
} from "../components/SecureDashboardWorkload.jsx";

export function IctOfficerDashboardPage({ dashboard }) {
  const stats = dashboard.stats || {};
  const tickets = fallbackDashboardTickets("ict_officer");

  return (
    <div className="secure-dashboard-page">
      <section className="secure-dashboard-head">
        <div>
          <h2>ICT Operations</h2>
          <p>
            Focus on unassigned work, overdue tickets, SLA risk, and technician
            capacity.
          </p>
        </div>
        <Link to="/service-requests">
          <Button>New Ticket</Button>
        </Link>
      </section>

      {dashboard.error ? (
        <ErrorState
          title="Dashboard unavailable"
          description={dashboard.error}
          onRetry={() => dashboard.loadDashboard(dashboard.filters)}
        />
      ) : null}
      {dashboard.isLoading ? (
        <LoadingState
          variant="table"
          description="Loading ICT operations dashboard..."
        />
      ) : null}

      <section className="secure-dashboard-metric-grid responsive-grid-3">
        <SecureDashboardMetricCard
          label="Unassigned"
          value={stats.pending_requests || 0}
          hint="Awaiting dispatch"
          tone="danger"
        />
        <SecureDashboardMetricCard
          label="Overdue"
          value={stats.overdue_requests || 0}
          hint="Exceeded target limits"
          tone="danger"
        />
        {/* <SecureDashboardMetricCard label="SLA Risk" value={stats.escalated_requests || 0} hint="Tickets at risk of breach" tone="warning" /> */}
        <SecureDashboardMetricCard
          label="Technician Capacity"
          value={`${(stats.technician_workload || []).length || 3} / 4`}
          hint="Technicians near limit"
          tone="success"
        />
      </section>

      <section className="secure-dashboard-two-column">
        <SecureRequestTable
          rows={tickets}
          title="Unassigned Tickets"
          mode="officer"
        />
        <TechnicianCapacityPanel rows={stats.technician_workload || []} />
      </section>

      <SlaSummaryCards stats={stats} />
    </div>
  );
}
