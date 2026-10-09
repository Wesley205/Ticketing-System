import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState } from "../../../components/feedback/ErrorState.jsx";
import { LoadingState } from "../../../components/feedback/LoadingState.jsx";
import { Button } from "../../../components/forms/Button.jsx";
import { fetchTickets } from "../../service-requests/services/service-requests-api.js";
import { SecureDashboardMetricCard } from "../components/SecureDashboardCards.jsx";
import { SecureRequestTable } from "../components/SecureDashboardTables.jsx";
import {
  SlaSummaryCards,
  TechnicianCapacityPanel,
} from "../components/SecureDashboardWorkload.jsx";

export function IctOfficerDashboardPage({ dashboard }) {
  const stats = dashboard.stats || {};
  const technicianWorkload = stats.technician_workload || [];
  const nearLimitCount = technicianWorkload.filter((row) => {
    const open = Number(row.open_requests || row.open_count || row.active_count || 0);
    const limit = Number(row.capacity_limit || row.max_open_requests || 15);
    return limit > 0 && open >= Math.max(1, Math.floor(limit * 0.8));
  }).length;
  const [tickets, setTickets] = useState([]);
  const [ticketsError, setTicketsError] = useState("");
  const [isTicketsLoading, setIsTicketsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadTickets() {
      setIsTicketsLoading(true);
      setTicketsError("");

      try {
        const rows = await fetchTickets();
        if (!mounted) return;
        const activeRows = Array.isArray(rows)
          ? rows
              .filter((ticket) => !["Resolved", "Closed", "Cancelled"].includes(ticket.status))
              .sort((first, second) => {
                const priorityRank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
                return (priorityRank[first.priority] ?? 4) - (priorityRank[second.priority] ?? 4);
              })
          : [];
        setTickets(activeRows);
      } catch (error) {
        if (!mounted) return;
        setTickets([]);
        setTicketsError(error.message || "Failed to load operational tickets.");
      } finally {
        if (mounted) setIsTicketsLoading(false);
      }
    }

    loadTickets();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="secure-dashboard-page">
      <section className="secure-dashboard-head">
        <div>
          <h2>ICT Operations</h2>
          <p>
            Focus on unassigned work, overdue tickets, SLA risk, and technician
            capacity.
          </p>
          <small className="secure-dashboard-last-updated">
            {dashboard.lastUpdated ? `Last updated ${dashboard.lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Updating metrics'}
          </small>
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
      {ticketsError ? (
        <ErrorState
          title="Ticket queue unavailable"
          description={ticketsError}
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
          value={`${nearLimitCount} / ${technicianWorkload.length || 0}`}
          hint="Near workload limit"
          tone="success"
        />
      </section>

      <section className="secure-dashboard-two-column">
        {isTicketsLoading ? (
          <LoadingState
            variant="table"
            description="Loading operational ticket queue..."
          />
        ) : (
          <SecureRequestTable
            rows={tickets}
            title="Active Tickets"
            mode="officer"
          />
        )}
        <TechnicianCapacityPanel rows={technicianWorkload} />
      </section>

      <SlaSummaryCards stats={stats} />
    </div>
  );
}
