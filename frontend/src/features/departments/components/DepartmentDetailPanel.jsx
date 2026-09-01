import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

export function DepartmentDetailPanel({
  department,
  isLoading = false,
  error = '',
  canManage = false,
  onEdit,
}) {
  if (isLoading) {
    return <LoadingState description="Loading department detail..." />;
  }

  if (error) {
    return <ErrorState title="Department detail unavailable" description={error} />;
  }

  if (!department) {
    return (
      <Panel title="Department Detail">
        <p className="react-copy">Select a department to view staff, assets, and service requests.</p>
      </Panel>
    );
  }

  return (
    <div className="ui-stack-md">
      <Panel
        title={department.name}
        actions={canManage ? <Button variant="secondary" onClick={() => onEdit(department)}>Edit Department</Button> : null}
      >
        <p className="react-copy">{department.description || 'No description provided.'}</p>
        <div className="ticket-kpi-grid">
          <div className="ticket-kpi-card"><span>Staff</span><strong>{department.staff.length}</strong></div>
          <div className="ticket-kpi-card"><span>Assets</span><strong>{department.assets.length}</strong></div>
          <div className="ticket-kpi-card"><span>Requests</span><strong>{department.service_requests.length}</strong></div>
        </div>
      </Panel>

      <Panel title="Department Members">
        <DataTable
          columns={[
            { key: 'full_name', label: 'Name' },
            { key: 'role', label: 'Role' },
          ]}
          rows={department.staff.map((user) => ({ ...user, key: user.user_id }))}
        />
      </Panel>

      <Panel title="Department Assets">
        <DataTable
          columns={[
            { key: 'asset_tag', label: 'Asset Tag' },
            { key: 'asset_type', label: 'Type' },
            { key: 'status', label: 'Status', render: (asset) => <StatusBadge value={asset.status} /> },
          ]}
          rows={department.assets.map((asset) => ({ ...asset, key: asset.asset_id }))}
        />
      </Panel>

      <Panel title="Department Service Requests">
        <DataTable
          columns={[
            { key: 'request_id', label: 'ID', render: (ticket) => `#${ticket.request_id}` },
            { key: 'subject', label: 'Subject' },
            { key: 'priority', label: 'Priority', render: (ticket) => <PriorityBadge priority={ticket.priority} /> },
            { key: 'status', label: 'Status', render: (ticket) => <StatusBadge value={ticket.status} /> },
            { key: 'date_submitted', label: 'Submitted', render: (ticket) => formatDateTime(ticket.date_submitted) },
          ]}
          rows={department.service_requests.map((ticket) => ({ ...ticket, key: ticket.request_id }))}
        />
      </Panel>
    </div>
  );
}
