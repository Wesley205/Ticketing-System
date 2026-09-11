import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { TechnicianDashboardLayout } from '../components/TechnicianDashboardLayout.jsx';
import { useTechnicianWork } from '../hooks/useTechnicianWork.js';

function workSubject(ticket) {
  return ticket.subject || ticket.description || 'Assigned ticket';
}

function maintenanceTitle(record) {
  return record.problem || record.maintenance_type || 'Scheduled maintenance';
}

function WorkSummaryCard({ tone, eyebrow, value, description }) {
  return (
    <article className={`technician-dashboard-summary-card technician-dashboard-summary-card-${tone}`}>
      <div className="technician-dashboard-card-dot" aria-hidden="true" />
      <span>{eyebrow}</span>
      <strong>{value}</strong>
      <p>{description}</p>
    </article>
  );
}

function PriorityQueue({ rows }) {
  if (!rows.length) {
    return <EmptyState variant="requests" title="No priority work queued." description="Assigned tickets that need technician action will appear here." actionLabel="View Assigned Work" actionTo="/technician/assigned-work" />;
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
            <th>SLA Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((ticket) => (
            <tr key={ticket.request_id}>
              <td>
                <Link to={`/technician/work/ticket/${ticket.request_id}`}>
                  {ticket.ticket_number || `#${ticket.request_id}`}
                </Link>
              </td>
              <td>{workSubject(ticket)}</td>
              <td><PriorityBadge value={ticket.priority} /></td>
              <td><StatusBadge value={ticket.status} /></td>
              <td className={ticket.isOverdue ? 'technician-dashboard-overdue-text' : ''}>{ticket.slaLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MaintenanceDueList({ rows }) {
  if (!rows.length) {
    return <EmptyState title="No maintenance due today." description="Due preventive and corrective maintenance tasks will appear here." actionLabel="View Maintenance" actionTo="/maintenance" />;
  }

  return (
    <div className="technician-dashboard-maintenance-list">
      {rows.slice(0, 4).map((record) => (
        <article className="technician-dashboard-maintenance-card" key={record.maintenance_id}>
          <div className="technician-dashboard-maintenance-head">
            <strong>{record.asset_tag || `Asset #${record.asset_id || '-'}`}</strong>
            <span>{record.maintenance_type || 'Maintenance'}</span>
          </div>
          <h3>{maintenanceTitle(record)}</h3>
          <p>{record.notes || `Scheduled ${formatDateTime(record.scheduled_start_at || record.maintenance_date)}.`}</p>
          <div className="technician-dashboard-maintenance-footer">
            <small>Est: {record.estimated_duration_minutes || record.estimated_minutes || 30} min</small>
            <Link to={`/technician/work/maintenance/${record.maintenance_id}`}>
              <Button size="sm">Start</Button>
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export function TechnicianDashboardPage() {
  const workState = useTechnicianWork();
  const dashboard = workState.dashboard;
  const nextAction = dashboard.nextAction;

  return (
    <TechnicianDashboardLayout>
      <section className="technician-dashboard-hero">
        <div>
          <h2>Next Actionable Work</h2>
          <p>Focus on the most urgent tickets first, then complete today&apos;s scheduled maintenance.</p>
        </div>
        {nextAction ? (
          <Link to={nextAction.href}>
            <Button className="technician-dashboard-continue">Continue work</Button>
          </Link>
        ) : null}
      </section>

      {workState.error ? (
        <ErrorState title="Technician dashboard unavailable" description={workState.error} onRetry={() => workState.refresh(workState.filters)} />
      ) : null}

      {workState.isLoading ? <LoadingState variant="table" description="Loading technician dashboard..." /> : null}

      <section className="technician-dashboard-summary-grid" aria-label="Technician work summary">
        <WorkSummaryCard
          tone="danger"
          eyebrow="Overdue Tickets"
          value={dashboard.overdueTickets.length}
          description={
            dashboard.overdueTickets.length
              ? `${dashboard.overdueTickets.length} ticket${dashboard.overdueTickets.length === 1 ? '' : 's'} overdue. Resolve it first to protect SLA compliance.`
              : 'No overdue assigned tickets.'
          }
        />
        <WorkSummaryCard
          tone="warning"
          eyebrow="Maintenance Due Today"
          value={dashboard.todayMaintenance.length}
          description={
            dashboard.todayMaintenance.length
              ? `${dashboard.todayMaintenance.length} scheduled task${dashboard.todayMaintenance.length === 1 ? '' : 's'} are due today.`
              : 'No maintenance tasks are due today.'
          }
        />
      </section>

      <section className="technician-dashboard-work-grid">
        <div className="technician-dashboard-section">
          <div className="technician-dashboard-section-head">
            <h2>Priority queue</h2>
            <span>{dashboard.overdueTickets.length} overdue</span>
          </div>
          <PriorityQueue rows={dashboard.priorityQueue} />
        </div>

        <div className="technician-dashboard-section">
          <div className="technician-dashboard-section-head">
            <h2>Maintenance Due Today</h2>
            <span>{dashboard.todayMaintenance.length} today</span>
          </div>
          <MaintenanceDueList rows={dashboard.todayMaintenance} />
        </div>
      </section>
    </TechnicianDashboardLayout>
  );
}
