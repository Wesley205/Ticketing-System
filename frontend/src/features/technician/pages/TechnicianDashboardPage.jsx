import { Link } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { AssignedMaintenanceList } from '../components/AssignedMaintenanceList.jsx';
import { AssignedTicketList } from '../components/AssignedTicketList.jsx';
import { useTechnicianWork } from '../hooks/useTechnicianWork.js';

function QueueKpi({ label, value }) {
  return (
    <div className="ticket-kpi-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function TechnicianDashboardPage() {
  const auth = useAuth();
  const workState = useTechnicianWork();

  return (
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 5"
        title="Technician Workspace"
        description="Assigned ticket execution, resolution logging, and maintenance work now run inside the React shell."
        meta={[
          auth.accessProfile?.role_label || 'Technician',
          `${workState.queues.activeTickets.length} active tickets`,
          `${workState.queues.activeMaintenance.length} active maintenance items`,
        ]}
      />

      <Panel
        title="Assigned Queues"
        actions={(
          <div className="ui-inline-actions">
            <Button variant={workState.filters.tab === 'active' ? 'primary' : 'secondary'} onClick={() => workState.updateFilter('tab', 'active')}>Active</Button>
            <Button variant={workState.filters.tab === 'pending_resolution' ? 'primary' : 'secondary'} onClick={() => workState.updateFilter('tab', 'pending_resolution')}>Pending Resolution</Button>
            <Button variant={workState.filters.tab === 'completed' ? 'primary' : 'secondary'} onClick={() => workState.updateFilter('tab', 'completed')}>Completed</Button>
            <Button variant="secondary" onClick={() => workState.refresh(workState.filters)}>Refresh</Button>
          </div>
        )}
      >
        <div className="ticket-kpi-grid">
          <QueueKpi label="Open Tickets" value={workState.queues.activeTickets.length} />
          <QueueKpi label="Completed Tickets" value={workState.queues.completedTickets.length} />
          <QueueKpi label="Open Maintenance" value={workState.queues.activeMaintenance.length} />
          <QueueKpi label="Completed Maintenance" value={workState.queues.completedMaintenance.length} />
        </div>
      </Panel>

      {workState.error ? (
        <ErrorState title="Technician workspace unavailable" description={workState.error} onRetry={() => workState.refresh(workState.filters)} />
      ) : null}

      {workState.isLoading ? <LoadingState description="Loading technician queues..." /> : null}

      <div className="service-grid-react">
        <Panel title="Assigned Tickets">
          <div className="ui-stack-md">
            <input
              className="ui-input"
              placeholder="Search ticket number, subject, status, requester..."
              value={workState.filters.ticketSearch}
              onChange={(event) => workState.updateFilter('ticketSearch', event.target.value)}
            />
            {workState.visibleTickets.length ? (
              <AssignedTicketList tickets={workState.visibleTickets} />
            ) : (
              <EmptyState title="No assigned tickets in this queue." description="Adjust the workspace tab or wait for new assignments." />
            )}
          </div>
        </Panel>

        <Panel title="Assigned Maintenance">
          <div className="ui-stack-md">
            <div className="ui-inline-actions technician-filter-row">
              <input
                className="ui-input"
                placeholder="Search asset, issue, status..."
                value={workState.filters.maintenanceSearch}
                onChange={(event) => workState.updateFilter('maintenanceSearch', event.target.value)}
              />
              <select
                className="ui-input technician-filter-select"
                value={workState.filters.maintenanceStatus}
                onChange={(event) => workState.updateFilter('maintenanceStatus', event.target.value)}
              >
                <option value="">All maintenance statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            {workState.visibleMaintenance.length ? (
              <AssignedMaintenanceList records={workState.visibleMaintenance} />
            ) : (
              <EmptyState title="No maintenance work in this queue." description="Assigned preventive and corrective tasks will appear here." />
            )}
          </div>
        </Panel>
      </div>

      <Panel title="Technician Constraints">
        <div className="ui-stack-md">
          <p className="react-copy">
            Assignment and reassignment remain intentionally absent from this workspace. Ticket ownership stays controlled by the backend and by ICT officer or administrator workflows.
          </p>
          <div className="ui-inline-actions">
            <Link to="/service-requests"><Button variant="secondary">Open service desk workspace</Button></Link>
            <a href="/technician"><Button variant="secondary">Refresh technician workspace</Button></a>
          </div>
        </div>
      </Panel>
    </div>
  );
}
