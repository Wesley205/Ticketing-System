import { formatCurrency } from '../../../lib/formatting.js';
import { formatHours, formatPercent } from '../services/dashboard-api.js';

function MetricCard({ label, value, tone = 'neutral', subtitle = null }) {
  return (
    <article className={`dashboard-metric-card dashboard-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {subtitle ? <small>{subtitle}</small> : null}
    </article>
  );
}

export function DashboardMetricCards({ stats }) {
  if (!stats) return null;

  return (
    <div className="ui-stack-lg">
      <section className="dashboard-metric-section">
        <h3>Operational Snapshot</h3>
        <div className="dashboard-metric-grid">
          <MetricCard label="Total Requests" value={stats.total_requests} />
          <MetricCard label="Pending Requests" value={stats.pending_requests} tone="warning" />
          <MetricCard label="Active Work" value={stats.in_progress_requests} tone="active" />
          <MetricCard label="Resolved" value={stats.resolved_requests} tone="success" />
          <MetricCard label="Overdue" value={stats.overdue_requests} tone={stats.overdue_requests ? 'danger' : 'success'} />
          <MetricCard label="Escalated" value={stats.escalated_requests} tone={stats.escalated_requests ? 'danger' : 'neutral'} />
        </div>
      </section>

      <section className="dashboard-metric-section">
        <h3>SLA and Maintenance</h3>
        <div className="dashboard-metric-grid">
          <MetricCard label="Response SLA Met" value={formatPercent(stats.response_sla_met_rate)} />
          <MetricCard label="Resolution SLA Met" value={formatPercent(stats.resolution_sla_met_rate)} />
          <MetricCard label="Avg Resolution Hours" value={formatHours(stats.avg_resolution_hours)} />
          <MetricCard label="Maintenance Records" value={stats.maintenance_total_records} />
          <MetricCard label="Maintenance Cost" value={formatCurrency(stats.maintenance_total_cost)} />
          <MetricCard label="Due Maintenance" value={stats.due_maintenance_schedules} tone={stats.due_maintenance_schedules ? 'warning' : 'success'} />
        </div>
      </section>

      <section className="dashboard-metric-section">
        <h3>Assets</h3>
        <div className="dashboard-metric-grid">
          <MetricCard label="Total Assets" value={stats.total_assets} />
          <MetricCard label="Active Assets" value={stats.active_assets} />
          <MetricCard label="Available Assets" value={stats.available_assets} tone="success" />
          <MetricCard label="Assigned Assets" value={stats.assigned_assets} />
          <MetricCard label="Under Maintenance" value={stats.maintenance_assets} tone="warning" />
          <MetricCard label="Damaged / Retired" value={`${stats.damaged_assets} / ${stats.retired_assets}`} tone={stats.damaged_assets || stats.retired_assets ? 'danger' : 'neutral'} />
        </div>
      </section>
    </div>
  );
}
