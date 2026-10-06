import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatCurrency, formatDate } from '../../../lib/formatting.js';
import { getChecklistItems } from '../services/maintenance-api.js';

export function MaintenanceList({ records = [], canManage = false, onEdit, onComplete }) {
  const columns = [
    { key: 'maintenance_id', label: 'ID', render: (record) => `MNT-${String(record.maintenance_id).padStart(4, '0')}` },
    {
      key: 'asset_tag',
      label: 'Asset',
      render: (record) => (
        <div>
          <strong>{record.asset_tag || '-'}</strong>
          <small className="maintenance-subtext">{record.asset_type || record.model || '-'}</small>
        </div>
      ),
    },
    { key: 'problem', label: 'Problem' },
    { key: 'maintenance_type', label: 'Type', render: (record) => record.maintenance_type || 'Corrective' },
    { key: 'status', label: 'Status', render: (record) => <StatusBadge value={record.status} /> },
    { key: 'technician_name', label: 'Technician', render: (record) => record.technician_name || '-' },
    { key: 'maintenance_date', label: 'Due', render: (record) => formatDate(record.next_due_at || record.scheduled_start_at || record.maintenance_date) },
    {
      key: 'actions',
      label: 'Actions',
      render: (record) => (
        <div className="secure-row-actions">
          <Button variant="ghost" size="sm" onClick={() => onEdit(record)} title="Edit maintenance record">
            <AppIcon name="edit" size={16} />
            Edit
          </Button>
          {canManage && record.status !== 'Completed' && record.status !== 'Cancelled' ? (
            <Button variant="secondary" size="sm" onClick={() => onComplete(record)}>
              <AppIcon name="complete" size={16} />
              Complete
            </Button>
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
        {record.cost ? <small className="maintenance-subtext">{formatCurrency(record.cost)}</small> : null}
      </div>
    ),
  }));

  return (
    <DataTable
      columns={columns}
      rows={rows}
      emptyState={<EmptyState variant="search" title="No maintenance records" description="No records matched the current maintenance filters." />}
    />
  );
}
