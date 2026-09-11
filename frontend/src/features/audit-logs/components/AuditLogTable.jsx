import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

const columns = [
  {
    key: 'created_at',
    label: 'Time',
    render: (row) => formatDateTime(row.created_at),
  },
  {
    key: 'actor',
    label: 'Actor',
    render: (row) => (
      <div className="audit-actor-cell">
        <strong>{row.user_name}</strong>
        <span>{row.user_role}</span>
      </div>
    ),
  },
  {
    key: 'action',
    label: 'Action',
    render: (row) => <span className="audit-action-pill">{row.action}</span>,
  },
  {
    key: 'record',
    label: 'Entity',
    render: (row) => (
      <span className="audit-entity-link">
        {row.record_type || '-'}{row.record_id ? ` #${row.record_id}` : ''}
      </span>
    ),
  },
  { key: 'details', label: 'Details' },
  {
    key: 'ip',
    label: 'IP',
    render: (row) => row.ip_address || row.ip || '-',
  },
];

export function AuditLogTable({ rows = [] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows.map((row) => ({ ...row, key: row.log_id }))}
      emptyState={<EmptyState variant="search" title="No audit records found" description="No records match the current audit filters or authorized scope." />}
    />
  );
}
