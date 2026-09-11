import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
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
    return <LoadingState variant="detail" description="Loading department detail..." />;
  }

  if (error) {
    return <ErrorState title="Department detail unavailable" description={error} />;
  }

  if (!department) {
    return (
      <section className="department-secure-detail">
        <h3>Department Detail</h3>
        <p className="react-copy">Select a department to view staff, assets, and service requests.</p>
      </section>
    );
  }

  return (
    <section className="department-secure-detail">
      <header className="department-secure-detail-head">
        <div>
          <h3>{department.name}</h3>
          <span>{department.code || `DPT-${String(department.department_id).padStart(4, '0')}`}</span>
        </div>
        {canManage ? <Button variant="secondary" size="sm" onClick={() => onEdit(department)}>Edit Department</Button> : null}
      </header>

      <div className="department-secure-detail-body">
        <p className="react-copy">{department.description || 'No description provided.'}</p>

        <div className="department-kpi-grid">
          <article><span>Staff Members</span><strong>{department.staff.length}</strong><small>profiles</small></article>
          <article><span>Intelligence Assets</span><strong>{department.assets.length}</strong><small>registered</small></article>
          <article><span>Active Operations</span><strong>{department.service_requests.length}</strong><small>incident tickets</small></article>
        </div>

        <div className="department-detail-columns">
          <section>
            <h4>Members</h4>
            <DataTable
              columns={[
                { key: 'full_name', label: 'Name' },
                { key: 'role', label: 'Clearance' },
              ]}
              rows={department.staff.map((user) => ({ ...user, key: user.user_id }))}
            />
          </section>

          <section>
            <h4>Assets</h4>
            <DataTable
              columns={[
                { key: 'asset_tag', label: 'Asset' },
                { key: 'status', label: 'Status', render: (asset) => <StatusBadge value={asset.status} /> },
              ]}
              rows={department.assets.map((asset) => ({ ...asset, key: asset.asset_id }))}
            />
          </section>
        </div>

        <section>
          <h4>Tickets</h4>
        <DataTable
          columns={[
            { key: 'request_id', label: 'Ticket', render: (ticket) => ticket.ticket_number || `#${ticket.request_id}` },
            { key: 'subject', label: 'Subject' },
            { key: 'priority', label: 'Priority', render: (ticket) => <PriorityBadge priority={ticket.priority} /> },
            { key: 'status', label: 'Status', render: (ticket) => <StatusBadge value={ticket.status} /> },
            { key: 'date_submitted', label: 'Updated', render: (ticket) => formatDateTime(ticket.date_submitted) },
          ]}
          rows={department.service_requests.map((ticket) => ({ ...ticket, key: ticket.request_id }))}
        />
        </section>

        <div className="department-policy-note">
          Policy: Secure departments cannot be deleted. Staff association must be authorized and managed individually through the Staff Directory.
        </div>
      </div>
    </section>
  );
}
