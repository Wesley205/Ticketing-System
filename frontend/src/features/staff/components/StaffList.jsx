import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDate } from '../../../lib/formatting.js';
import { getRoleLabel, getUserTypeLabel, isTemporaryUser } from '../services/staff-api.js';

export function StaffList({
  rows = [],
  canManage = false,
  onSelect,
  onEdit,
  onToggleActive,
  onExtend,
}) {
  if (!rows.length) {
    return <EmptyState title="No staff found." description="Adjust your directory filters or create an approved account." />;
  }

  return (
    <DataTable
      columns={[
        {
          key: 'full_name',
          label: 'Name',
          render: (row) => (
            <button type="button" className="ticket-link-button" onClick={() => onSelect(row)}>
              {row.full_name}
            </button>
          ),
        },
        { key: 'email', label: 'Email' },
        {
          key: 'user_type',
          label: 'User Type',
          render: (row) => getUserTypeLabel(row.user_type),
        },
        {
          key: 'role',
          label: 'Role',
          render: (row) => getRoleLabel(row.role),
        },
        {
          key: 'department_name',
          label: 'Department',
          render: (row) => row.department_name || '-',
        },
        {
          key: 'account_expiration_date',
          label: 'Expiry',
          render: (row) => formatDate(row.account_expiration_date),
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <StatusBadge value={row.is_active ? (row.account_status || 'active') : 'inactive'} />,
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            <div className="ui-inline-actions">
              <button type="button" className="ticket-link-button" onClick={() => onSelect(row)}>Open</button>
              {canManage ? (
                <>
                  <button type="button" className="ticket-link-button" onClick={() => onEdit(row)}>Edit</button>
                  <button type="button" className="ticket-link-button" onClick={() => onToggleActive(row)}>
                    {row.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  {isTemporaryUser(row.user_type) ? (
                    <button type="button" className="ticket-link-button" onClick={() => onExtend(row)}>Extend</button>
                  ) : null}
                </>
              ) : null}
            </div>
          ),
        },
      ]}
      rows={rows}
    />
  );
}
