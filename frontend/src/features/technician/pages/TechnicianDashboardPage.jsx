import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { TechnicianDashboardLayout } from '../components/TechnicianDashboardLayout.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { useTechnicianWork } from '../hooks/useTechnicianWork.js';

function workSubject(ticket) {
  return ticket.subject || ticket.description || 'Assigned ticket';
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

export function TechnicianDashboardPage() {
  const auth = useAuth();
  const workState = useTechnicianWork();
  const dashboard = workState.dashboard;
  const nextAction = dashboard.nextAction;
  const assignedFloor = auth.user?.floor_label || null;

  return (
    <TechnicianDashboardLayout>
      <section className="technician-dashboard-hero">
        <div>
          <h2>Assigned work</h2>
          <p>
            {assignedFloor
              ? `You are assigned to ${assignedFloor}. Same-floor work is prioritized when officers dispatch tickets.`
              : 'No floor is assigned to your technician profile yet. Contact an ICT officer if this is incorrect.'}
          </p>
          <small className="technician-dashboard-last-updated">
            {workState.lastUpdated ? `Last updated ${workState.lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Updating work queue'}
          </small>
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
      </section>

      <section className="technician-dashboard-work-grid">
        <div className="technician-dashboard-section">
          <div className="technician-dashboard-section-head">
            <h2>Priority queue</h2>
            <span>{dashboard.overdueTickets.length} overdue</span>
          </div>
          <PriorityQueue rows={dashboard.priorityQueue} />
        </div>
      </section>
    </TechnicianDashboardLayout>
  );
}
