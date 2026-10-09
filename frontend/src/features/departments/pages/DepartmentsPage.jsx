import { useState } from 'react';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { hasPermission } from '../../../permissions/access.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { DepartmentDetailPanel } from '../components/DepartmentDetailPanel.jsx';
import { DepartmentFormModal } from '../components/DepartmentFormModal.jsx';
import { DepartmentList } from '../components/DepartmentList.jsx';
import { useDepartments } from '../hooks/useDepartments.js';

export function DepartmentsPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const canManage = hasPermission(auth.accessProfile, 'can_manage_departments')
    || auth.accessProfile?.permissions?.can_access_admin_portal === true
    || auth.user?.role === 'admin';
  const departments = useDepartments({ enabled: auth.isReady && auth.isAuthenticated });
  const [formOpen, setFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [departmentView, setDepartmentView] = useState('all');

  function openCreate() {
    setEditingDepartment(null);
    setFormOpen(true);
  }

  function openEdit(department) {
    setEditingDepartment(department);
    setFormOpen(true);
  }

  return (
    <SecureWorkspaceLayout title="NSC Departments Hub" subtitle="ICT Service Hub">
      <div className="secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>Departments Directory</h2>
            <p>Department records, membership, linked assets, and department-scoped service requests.</p>
          </div>
          <div className="service-desk-secure-actions">
            <Button variant="secondary" onClick={departments.loadDepartments}>Refresh</Button>
            {canManage ? <Button onClick={openCreate}><AppIcon name="plus" size={16} /> New Department</Button> : null}
          </div>
        </div>

        <div className="department-secure-layout">
        <section className="secure-data-panel">
          <FormField label="Search Departments" htmlFor="department-search">
            <input
              id="department-search"
              className="ui-input"
              value={departments.search}
              placeholder="Search name, description, or counts"
              onChange={(event) => departments.setSearch(event.target.value)}
            />
          </FormField>
          <div className="secure-segmented-control">
            {['all', 'staff', 'assets', 'tickets'].map((item) => (
              <button
                key={item}
                type="button"
                className={departmentView === item ? 'active' : ''}
                onClick={() => setDepartmentView(item)}
              >
                {item === 'all' ? 'All' : item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

          {departments.error ? (
            <ErrorState title="Departments unavailable" description={departments.error} onRetry={departments.loadDepartments} />
          ) : null}

          {departments.isLoading ? (
            <LoadingState variant="table" description="Loading departments..." />
          ) : (
            <DepartmentList
              departments={departments.departments}
              selectedDepartmentId={departments.selectedDepartment?.department_id}
              onView={(department) => departments.loadDepartmentDetail(department.department_id)}
            />
          )}
        </section>

        <DepartmentDetailPanel
          department={departments.selectedDepartment}
          isLoading={departments.isDetailLoading}
          error={departments.detailError}
          canManage={canManage}
          onEdit={openEdit}
          view={departmentView}
        />
      </div>

      <DepartmentFormModal
        open={formOpen}
        department={editingDepartment}
        onClose={() => setFormOpen(false)}
        isSubmitting={departments.isSubmitting}
        onSubmit={async (payload) => {
          const saved = await departments.submitDepartment(payload, editingDepartment?.department_id || null);
          showToast({ tone: 'success', title: editingDepartment ? 'Department updated' : 'Department created' });
          if (!editingDepartment) {
            await departments.loadDepartmentDetail(saved.department_id);
          }
        }}
      />
      </div>
    </SecureWorkspaceLayout>
  );
}
