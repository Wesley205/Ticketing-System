import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../../../lib/formatting.js';
import { getChecklistItems } from '../services/maintenance-api.js';

export function MaintenanceList({ records = [], canManage = false, onEdit, onComplete }) {
  const columns = [
    { key: 'asset_tag', label: 'Asset', render: (record) => record.asset_tag || '-' },
    { key: 'maintenance_type', label: 'Type', render: (record) => record.maintenance_type || 'Corrective' },
    { key: 'problem', label: 'Problem' },
    { key: 'technician_name', label: 'Technician', render: (record) => record.technician_name || '-' },
    { key: 'maintenance_date', label: 'Date', render: (record) => formatDate(record.maintenance_date) },
    { key: 'status', label: 'Status', render: (record) => <StatusBadge value={record.status} /> },
    { key: 'cost', label: 'Cost', render: (record) => formatCurrency(record.cost) },
    {
      key: 'actions',
      label: 'Actions',
      render: (record) => (
        <div className="ui-inline-actions">
          <Button variant="ghost" size="sm" onClick={() => onEdit(record)}>Details</Button>
          {canManage && record.status !== 'Completed' && record.status !== 'Cancelled' ? (
            <Button variant="secondary" size="sm" onClick={() => onComplete(record)}>Mark Complete</Button>
          ) : null}
        </div>
      ),
    },
  ];

  const rows = records.map((record) => ({
    ...record,
    key: record.maintenance_id,
    problem: (
      <div>
        <strong>{record.problem}</strong>
        {getChecklistItems(record).length ? (
          <small className="maintenance-subtext">{getChecklistItems(record).length} checklist item(s)</small>
        ) : null}
      </div>
    ),
  }));

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyState={<EmptyState title="No maintenance records" description="No records matched the current maintenance filters." />}
    />
  );
}
