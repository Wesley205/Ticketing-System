import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDate } from '../../../lib/formatting.js';
import { getRoleLabel, getUserTypeLabel } from '../services/staff-api.js';

export function InvitationList({ rows = [], onRevoke }) {
  if (!rows.length) {
    return <EmptyState variant="search" title="No invitations found." description="Pending, accepted, revoked, and expired invitations will appear here." />;
  }

  return (
    <DataTable
      columns={[
        { key: 'full_name', label: 'Name' },
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
          key: 'expires_at',
          label: 'Expiry',
          render: (row) => formatDate(row.expires_at),
        },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <StatusBadge value={row.status} />,
        },
        {
          key: 'actions',
          label: 'Actions',
          render: (row) => (
            row.status === 'pending'
              ? <button type="button" className="ticket-link-button" onClick={() => onRevoke(row)}>Revoke</button>
              : '-'
          ),
        },
      ]}
      rows={rows}
    />
  );
}
