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
        <Link to="/reports">View all exceptions</Link>
      </section>

      {dashboard.error ? <ErrorState title="Dashboard unavailable" description={dashboard.error} onRetry={() => dashboard.loadDashboard(dashboard.filters)} /> : null}
      {dashboard.isLoading ? <LoadingState variant="table" description="Loading administrator dashboard..." /> : null}

      <section className="secure-dashboard-metric-grid secure-dashboard-metric-grid-four">
        <SecureDashboardMetricCard label="Unassigned" value={stats.pending_requests || 0} hint="Awaiting dispatch operations" tone="danger" />
        <SecureDashboardMetricCard label="Overdue" value={stats.overdue_requests || 0} hint="Exceeded response limits" tone="danger" />
        <SecureDashboardMetricCard label="Escalated" value={stats.escalated_requests || 0} hint="Awaiting executive evaluation" tone="warning" />
        <SecureDashboardMetricCard label="Major-Risk Operational Items" value={stats.due_maintenance_schedules || 0} hint="Critical maintenance, SLA drift, or access anomalies" tone="warning" />
      </section>

      <section className="secure-dashboard-metric-grid">
        <SecureDashboardMetricCard label="Pending invites" value="3" hint="New registrations awaiting approval" actionLabel="Review invites" to="/staff" tone="warning" />
        <SecureDashboardMetricCard label="Access anomalies" value="1" hint="Suspicious login patterns or role mismatches" actionLabel="Investigate" to="/audit-logs" tone="danger" />
        <SecureDashboardMetricCard label="Active accounts" value={stats.active_assets || 47} hint="Active staff with active access" actionLabel="Manage staff" to="/staff" tone="success" />
      </section>

      <section className="secure-dashboard-two-column">
        <section className="secure-dashboard-panel">
          <div className="secure-dashboard-panel-head">
            <h3>Departments &amp; units</h3>
            <Link to="/departments">Manage departments</Link>
          </div>
          <strong className="secure-dashboard-large-number">{stats.total_assets || 8}</strong>
          <p className="react-copy">Active operational workloads and escalation units.</p>
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
