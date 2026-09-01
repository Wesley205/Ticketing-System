import { useState } from 'react';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { Panel } from '../../../components/layout/Panel.jsx';
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

  function openCreate() {
    setEditingDepartment(null);
    setFormOpen(true);
  }

  function openEdit(department) {
    setEditingDepartment(department);
    setFormOpen(true);
  }

  return (
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 8"
        title="Departments"
        description="Department records, membership, linked assets, and department-scoped service requests."
        meta={[
          auth.accessProfile?.role_label || 'User',
          `${departments.departments.length} visible department(s)`,
          canManage ? 'Administrator controls available' : 'Read-only scoped visibility',
        ]}
      />

      <div className="department-layout">
        <Panel
          title="Department Directory"
          actions={(
            <div className="ui-inline-actions">
              <Button variant="secondary" onClick={departments.loadDepartments}>Refresh</Button>
              {canManage ? <Button onClick={openCreate}>Add Department</Button> : null}
            </div>
          )}
        >
          <FormField label="Search Departments" htmlFor="department-search">
            <input
              id="department-search"
              className="ui-input"
              value={departments.search}
              placeholder="Search name, description, or counts"
              onChange={(event) => departments.setSearch(event.target.value)}
            />
          </FormField>

          {departments.error ? (
            <ErrorState title="Departments unavailable" description={departments.error} onRetry={departments.loadDepartments} />
          ) : null}

          {departments.isLoading ? (
            <LoadingState description="Loading departments..." />
          ) : (
            <DepartmentList
              departments={departments.departments}
              canManage={canManage}
              onView={(department) => departments.loadDepartmentDetail(department.department_id)}
              onEdit={openEdit}
            />
          )}
        </Panel>

        <DepartmentDetailPanel
          department={departments.selectedDepartment}
          isLoading={departments.isDetailLoading}
          error={departments.detailError}
          canManage={canManage}
          onEdit={openEdit}
        />
      </div>

      <div className="ui-inline-actions">
        <a href="/departments"><Button variant="secondary">Refresh departments</Button></a>
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
  );
}
