import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

const columns = [
  { key: 'user_name', label: 'User' },
  { key: 'user_role', label: 'Role' },
  { key: 'action', label: 'Action' },
  {
    key: 'record',
    label: 'Record',
    render: (row) => `${row.record_type || '-'}${row.record_id ? ` #${row.record_id}` : ''}`,
  },
  { key: 'details', label: 'Details' },
  {
    key: 'created_at',
    label: 'Date & Time',
    render: (row) => formatDateTime(row.created_at),
  },
];

export function AuditLogTable({ rows = [] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows.map((row) => ({ ...row, key: row.log_id }))}
      emptyState={<EmptyState title="No audit records found" description="No records match the current audit filters or authorized scope." />}
    />
  );
}
