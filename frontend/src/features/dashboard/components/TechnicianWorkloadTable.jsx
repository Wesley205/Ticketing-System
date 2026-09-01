import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';

export function TechnicianWorkloadTable({ rows = [] }) {
  if (!rows.length) {
    return <EmptyState title="No technician workload data" description="Technician workload is available for organization-scoped dashboard users." />;
  }

  return (
    <DataTable
      columns={[
        { key: 'technician', label: 'Technician' },
        {
          key: 'open_requests',
          label: 'Open Requests',
          render: (row) => Number(row.open_requests || 0),
        },
        {
          key: 'resolved_requests',
          label: 'Resolved Requests',
          render: (row) => Number(row.resolved_requests || 0),
        },
      ]}
      rows={rows}
    />
  );
}
