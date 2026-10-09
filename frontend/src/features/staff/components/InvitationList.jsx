import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDate } from '../../../lib/formatting.js';
import { getRoleLabel, getUserTypeLabel } from '../services/staff-api.js';

export function InvitationList({ rows = [], onRevoke, onResend }) {
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
              ? (
                <div className="ui-inline-actions">
                  <button type="button" className="ui-icon-button" onClick={() => onResend(row)} aria-label={`Resend invitation to ${row.email}`} title="Resend invitation"><AppIcon name="refresh" size={16} /></button>
                  <button type="button" className="ui-icon-button" onClick={() => onRevoke(row)} aria-label={`Revoke invitation for ${row.email}`} title="Revoke invitation"><AppIcon name="x" size={16} /></button>
                </div>
              )
              : '-'
          ),
        },
      ]}
      rows={rows}
    />
  );
}
