import { Panel } from '../../../components/layout/Panel.jsx';
import { formatCurrency, formatDateTime } from '../../../lib/formatting.js';
import { ResolutionForm } from './ResolutionForm.jsx';

const maintenanceStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];

export function WorkExecutionPanel({
  type = 'ticket',
  item,
  onSubmit,
  isSubmitting = false,
}) {
  if (!item) return null;

  if (type === 'maintenance') {
    return (
      <Panel title="Maintenance Execution">
        <div className="ui-stack-md">
          <div className="ticket-meta-grid">
            <div><strong>Asset</strong><span>{item.asset_tag || `Asset #${item.asset_id}`}</span></div>
            <div><strong>Type</strong><span>{item.maintenance_type || '-'}</span></div>
            <div><strong>Technician</strong><span>{item.technician_name || '-'}</span></div>
            <div><strong>Scheduled Start</strong><span>{formatDateTime(item.scheduled_start_at || item.maintenance_date)}</span></div>
            <div><strong>Cost</strong><span>{formatCurrency(item.cost || 0)}</span></div>
            <div><strong>Next Due</strong><span>{formatDateTime(item.next_due_at)}</span></div>
          </div>
          <div className="ticket-block">
            <strong>Problem</strong>
            <p className="react-copy">{item.problem || 'No problem statement provided.'}</p>
          </div>
          <ResolutionForm
            mode="maintenance"
            allowedStatuses={maintenanceStatuses}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
          />
        </div>
      </Panel>
    );
  }

  return (
    <Panel title="Work Execution">
      <div className="ui-stack-md">
        <p className="react-copy">
          Use the resolution workflow to record diagnosis, root cause, time spent, and the final resolution while the backend continues enforcing valid state transitions.
        </p>
        <ResolutionForm
          mode="ticket"
          allowedStatuses={item.permissions?.allowed_status_transitions || []}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </Panel>
  );
}
