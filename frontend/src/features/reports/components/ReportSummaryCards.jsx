import { formatCurrency } from '../../../lib/formatting.js';
import { formatRatio } from '../services/reports-api.js';

function metricValue(value) {
  return Number(value || 0).toLocaleString();
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="dashboard-metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

export function ReportSummaryCards({ summary }) {
  const assignment = summary?.requests_by_assignment || {};
  const sla = summary?.sla_performance || {};
  const schedules = summary?.maintenance_schedule_health || {};
  const linkage = summary?.asset_ticket_linkage || {};
  const kb = summary?.knowledge_base_analytics || {};
  const monthlyCost = (summary?.monthly_maintenance || [])
    .reduce((total, row) => total + Number(row.total_cost || 0), 0);

  return (
    <div className="dashboard-metric-section">
      <h3>Operational Metrics</h3>
      <div className="dashboard-metric-grid">
        <MetricCard label="Unassigned Requests" value={metricValue(assignment.unassigned)} hint="Open tickets without a technician" />
        <MetricCard label="Actively Assigned" value={metricValue(assignment.actively_assigned)} hint="Tickets currently in technician workflow" />
        <MetricCard label="Expected Completion Overdue" value={metricValue(assignment.expected_completion_overdue)} hint="Open tickets past expected completion" />
        <MetricCard label="Response SLA" value={formatRatio(sla.response_met, sla.response_measured)} hint={`${metricValue(sla.response_measured)} measured`} />
        <MetricCard label="Resolution SLA" value={formatRatio(sla.resolution_met, sla.resolution_measured)} hint={`${metricValue(sla.resolution_measured)} measured`} />
        <MetricCard label="Maintenance Cost" value={formatCurrency(monthlyCost)} hint="Filtered maintenance total" />
        <MetricCard label="Schedules Due" value={metricValue(schedules.due_now)} hint={`${metricValue(schedules.overdue)} overdue by more than 7 days`} />
        <MetricCard label="Linked Asset Tickets" value={metricValue(linkage.linked_tickets)} hint={`${metricValue(linkage.unlinked_tickets)} tickets without asset link`} />
        <MetricCard label="KB Views" value={metricValue(kb.total_views)} hint={`${metricValue(kb.helpful_feedback)} helpful votes`} />
      </div>
    </div>
  );
}
