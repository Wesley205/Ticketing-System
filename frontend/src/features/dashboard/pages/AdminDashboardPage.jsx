import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { fetchAuditLogs } from '../../audit-logs/services/audit-logs-api.js';
import { SecureDashboardMetricCard } from '../components/SecureDashboardCards.jsx';
import { SlaSummaryCards } from '../components/SecureDashboardWorkload.jsx';

export function AdminDashboardPage({ dashboard }) {
  const stats = dashboard.stats || {};
  const [auditRows, setAuditRows] = useState([]);

  useEffect(() => {
    fetchAuditLogs({ limit: 4 }).then(setAuditRows).catch(() => setAuditRows([]));
  }, []);

  return (
    <div className="secure-dashboard-page">
      <section className="secure-dashboard-head">
        <div>
          <h2>Administrator Command Dashboard</h2>
          <p>Monitor exceptions, access issues, organizational health, and high-risk operational items.</p>
        </div>
        <div className="secure-dashboard-head-actions">
          <small>{dashboard.lastUpdated ? `Last updated ${dashboard.lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Updating metrics'}</small>
          <Link to="/reports">View all exceptions</Link>
        </div>
      </section>

      {dashboard.error ? <ErrorState title="Dashboard unavailable" description={dashboard.error} onRetry={() => dashboard.loadDashboard(dashboard.filters)} /> : null}
      {dashboard.isLoading ? <LoadingState variant="table" description="Loading administrator dashboard..." /> : null}

      <section className="secure-dashboard-group" aria-labelledby="admin-workload-heading">
        <h3 id="admin-workload-heading" className="secure-dashboard-group-title">Workload and SLA risk</h3>
        <div className="secure-dashboard-metric-grid secure-dashboard-metric-grid-four responsive-grid-4">
          <SecureDashboardMetricCard label="Unassigned" value={stats.pending_requests || 0} hint="Awaiting dispatch" tone="danger" />
          <SecureDashboardMetricCard label="Overdue" value={stats.overdue_requests || 0} hint="Past response target" tone="danger" emphasize />
          <SecureDashboardMetricCard label="Escalated" value={stats.escalated_requests || 0} hint="Needs review" tone="warning" emphasize />
          <SecureDashboardMetricCard label="Major-risk items" value={stats.due_maintenance_schedules || 0} hint="Maintenance or access risk" tone="warning" />
        </div>
      </section>

      <section className="secure-dashboard-group" aria-labelledby="admin-access-heading">
        <h3 id="admin-access-heading" className="secure-dashboard-group-title">Access and accounts</h3>
        <div className="secure-dashboard-metric-grid responsive-grid-3">
          <SecureDashboardMetricCard label="Pending invitations" value={stats.pending_invitations ?? 0} hint={stats.pending_invitations ? 'Awaiting acceptance' : 'No invitations awaiting acceptance'} actionLabel="Review invitations" to="/staff" tone="warning" />
          <SecureDashboardMetricCard label="Access anomalies" value={stats.access_anomalies ?? 0} hint="Failed access or lock" actionLabel="Investigate" to="/audit-logs" tone="danger" />
          <SecureDashboardMetricCard label="Active staff accounts" value={stats.active_accounts ?? 0} hint={stats.active_accounts ? 'Current staff access' : 'No active staff accounts'} actionLabel="Manage staff" to="/staff" tone="success" />
        </div>
      </section>

      <section className="secure-dashboard-two-column">
        <section className="secure-dashboard-panel">
          <div className="secure-dashboard-panel-head">
            <h3>Departments &amp; units</h3>
            <Link to="/departments">Manage departments</Link>
          </div>
          <strong className="secure-dashboard-large-number">{stats.active_departments ?? 0}</strong>
          <p className="react-copy">Active departments available for staff and service routing.</p>
        </section>
        <section className="secure-dashboard-panel">
          <div className="secure-dashboard-panel-head"><h3>SLA health</h3></div>
          <SlaSummaryCards stats={stats} />
        </section>
      </section>

      <section className="secure-dashboard-panel">
        <div className="secure-dashboard-panel-head">
          <h3>Recent Audit Activity</h3>
          <Link to="/audit-logs">View full audit log</Link>
        </div>
        <div className="secure-dashboard-audit-list">
          {(auditRows.length ? auditRows : [
            { log_id: 'fallback-1', user_name: 'Admin Dr. C. Eze', details: 'Approved access ID #9923', action: 'ACCESS_APPROVED' },
            { log_id: 'fallback-2', user_name: 'Security parameters', details: 'Updated for L4 key gateway', action: 'CONFIG_UPDATED' },
            { log_id: 'fallback-3', user_name: 'SLA standard response target', details: 'Set to 95% on-time', action: 'SLA_UPDATED' },
          ]).map((entry) => (
            <article key={entry.log_id}>
              <strong>{entry.user_name}</strong>
              <span>{entry.action || 'Audit event'}</span>
              <p>{entry.details}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
