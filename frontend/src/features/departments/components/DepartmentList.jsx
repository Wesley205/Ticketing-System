import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { DataTable } from '../../../components/tables/DataTable.jsx';

export function DepartmentList({ departments = [], canManage = false, onView, onEdit }) {
  const columns = [
    { key: 'name', label: 'Name', render: (department) => <strong>{department.name}</strong> },
    { key: 'description', label: 'Description', render: (department) => department.description || '-' },
    { key: 'staff_count', label: 'Staff' },
    { key: 'asset_count', label: 'Assets' },
    { key: 'request_count', label: 'Requests' },
    {
      key: 'actions',
      label: 'Actions',
      render: (department) => (
        <div className="ui-inline-actions">
          <Button variant="ghost" size="sm" onClick={() => onView(department)}>View</Button>
          {canManage ? (
            <Button variant="secondary" size="sm" onClick={() => onEdit(department)}>Edit</Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={departments.map((department) => ({ ...department, key: department.department_id }))}
      emptyState={<EmptyState title="No departments found" description="No department records match your current scope or search." />}
    />
  );
}
