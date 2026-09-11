import { Link } from 'react-router-dom';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/formatting.js';

export function AssignedMaintenanceList({ records = [] }) {
  if (!records.length) {
    return <EmptyState title="No maintenance work found." description="Assigned preventive and corrective work will appear here." actionLabel="View Maintenance" actionTo="/maintenance" />;
  }

  return (
    <DataTable
      columns={[
        {
          key: 'maintenance_id',
          label: 'Record',
          render: (record) => (
            <Link to={`/technician/work/maintenance/${record.maintenance_id}`}>
              {`#${record.maintenance_id}`}
            </Link>
          ),
        },
        { key: 'maintenance_type', label: 'Type' },
        {
          key: 'asset',
          label: 'Asset',
          render: (record) => `${record.asset_tag || `Asset #${record.asset_id}`} - ${record.asset_type || 'Unknown'}`,
        },
        { key: 'problem', label: 'Problem' },
        {
          key: 'status',
          label: 'Status',
          render: (record) => <StatusBadge value={record.status} />,
        },
        {
          key: 'scheduled_start_at',
          label: 'Scheduled',
          render: (record) => formatDateTime(record.scheduled_start_at || record.maintenance_date),
        },
      ]}
      rows={records}
    />
  );
}
