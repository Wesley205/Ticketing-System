import { EmptyState } from '../../../components/feedback/EmptyState.jsx';

export function DepartmentList({ departments = [], selectedDepartmentId = null, onView }) {
  if (!departments.length) {
    return <EmptyState variant="search" title="No departments found" description="No department records match your current scope or search." />;
  }
  return (
    <div className="department-secure-list">
      {departments.map((department) => (
        <button
          key={department.department_id}
          type="button"
          className={`department-secure-row ${Number(selectedDepartmentId) === Number(department.department_id) ? 'active' : ''}`}
          onClick={() => onView(department)}
        >
          <span>
            <strong>{department.name}</strong>
            <small>{department.code || department.description || `DPT-${String(department.department_id).padStart(4, '0')}`}</small>
          </span>
          <b>{Number(department.staff_count || 0)} staff</b>
        </button>
      ))}
    </div>
  );
}
