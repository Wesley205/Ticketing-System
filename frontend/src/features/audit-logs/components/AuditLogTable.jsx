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
  const normalizedRows = rows.map((row) => ({ ...row, key: row.log_id }));
  const mobileRows = normalizedRows.slice(0, 25);

  if (!rows.length) {
    return (
      <div className="ui-table-empty">
        <EmptyState variant="search" title="No audit records found" description="No records match the current audit filters or authorized scope." />
      </div>
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        rows={normalizedRows}
      />
      <div className="audit-mobile-list" aria-label="Audit records">
        {mobileRows.map((row) => (
          <article className="audit-mobile-card" key={row.key}>
            <div className="audit-mobile-card-head">
              <time>{formatDateTime(row.created_at)}</time>
              <span className="audit-action-pill">{row.action}</span>
            </div>
            <div className="audit-mobile-actor">
              <strong>{row.user_name || 'System'}</strong>
              <span>{row.user_role || '-'}</span>
            </div>
            <p>{row.details || '-'}</p>
            <div className="audit-mobile-card-foot">
              <span className="audit-entity-link">
                {row.record_type || '-'}{row.record_id ? ` #${row.record_id}` : ''}
              </span>
              <span>{row.ip_address || row.ip || '-'}</span>
            </div>
          </article>
        ))}
        {normalizedRows.length > mobileRows.length ? (
          <p className="audit-mobile-limit-note">Showing the first {mobileRows.length} records. Use filters to narrow the audit trail.</p>
        ) : null}
      </div>
    </>
  );
}
