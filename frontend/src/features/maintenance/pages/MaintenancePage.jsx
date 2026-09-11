import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { hasPermission } from '../../../permissions/access.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { MaintenanceFilters } from '../components/MaintenanceFilters.jsx';
import { MaintenanceFormModal } from '../components/MaintenanceFormModal.jsx';
import { MaintenanceList } from '../components/MaintenanceList.jsx';
import { ScheduleFilters } from '../components/ScheduleFilters.jsx';
import { ScheduleFormModal } from '../components/ScheduleFormModal.jsx';
import { ScheduleList } from '../components/ScheduleList.jsx';
import { useMaintenance } from '../hooks/useMaintenance.js';
import { getChecklistItems } from '../services/maintenance-api.js';

function buildCompletionPayload(record) {
  return {
    action_taken: record.action_taken || 'Marked complete from maintenance workspace.',
    notes: record.notes || null,
    completion_notes: record.completion_notes || 'Maintenance completed.',
    checklist_items: getChecklistItems(record),
  };
}

export function MaintenancePage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const canManageMaintenance = hasPermission(auth.accessProfile, 'can_manage_maintenance');
  const canManageAssets = hasPermission(auth.accessProfile, 'can_manage_assets');
  const canEditSchedules = canManageMaintenance && canManageAssets;
  const maintenance = useMaintenance({ enabled: auth.isReady && canManageMaintenance });
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [actionError, setActionError] = useState('');
  const [activeTab, setActiveTab] = useState('records');

  function openRecordModal(record = null) {
    setEditingRecord(record);
    setActionError('');
    setRecordModalOpen(true);
  }

  function openScheduleModal(schedule = null) {
    setEditingSchedule(schedule);
    setActionError('');
    setScheduleModalOpen(true);
  }

  async function handleRecordSubmit(payload) {
    try {
      if (editingRecord) {
        await maintenance.submitMaintenanceUpdate(editingRecord.maintenance_id, payload);
        showToast({ tone: 'success', title: 'Maintenance record updated' });
      } else {
        await maintenance.submitMaintenance(payload);
        showToast({ tone: 'success', title: 'Maintenance record created' });
      }
    } catch (err) {
      setActionError(err.message || 'Failed to save maintenance record.');
      throw err;
    }
  }

  async function handleScheduleSubmit(payload) {
    try {
      if (editingSchedule) {
        await maintenance.submitScheduleUpdate(editingSchedule.schedule_id, payload);
        showToast({ tone: 'success', title: 'Maintenance schedule updated' });
      } else {
        await maintenance.submitSchedule(payload);
        showToast({ tone: 'success', title: 'Maintenance schedule created' });
      }
    } catch (err) {
      setActionError(err.message || 'Failed to save maintenance schedule.');
      throw err;
    }
  }

  if (!canManageMaintenance) {
    return (
      <ErrorState
        title="Maintenance unavailable"
        description="Your account does not have permission to access the maintenance workspace."
      />
    );
  }

  return (
    <SecureWorkspaceLayout title="Maintenance Desk" subtitle="ICT Security Hub">
      <div className="secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>Maintenance Records</h2>
            <p>View completed and in-progress maintenance tasks, and manage upcoming preventive schedules.</p>
          </div>
          <div className="service-desk-secure-actions">
            <Button variant="secondary" onClick={() => maintenance.refresh()}>Refresh</Button>
            {canManageMaintenance ? <Button onClick={() => openRecordModal()}>+ New Maintenance</Button> : null}
            {canEditSchedules ? <Button variant="secondary" onClick={() => openScheduleModal()}>+ Create Schedule</Button> : null}
          </div>
        </div>

        <div className="secure-tab-row">
          <button type="button" className={activeTab === 'records' ? 'active' : ''} onClick={() => setActiveTab('records')}>
            Records
          </button>
          <button type="button" className={activeTab === 'schedules' ? 'active' : ''} onClick={() => setActiveTab('schedules')}>
            Schedules
          </button>
        </div>

        <div className="secure-filter-bar">
          {activeTab === 'records' ? (
            <MaintenanceFilters
              filters={maintenance.filters}
              assets={maintenance.lookups.assets}
              onChange={maintenance.updateFilter}
            />
          ) : (
            <ScheduleFilters
              filters={maintenance.scheduleFilters}
              assets={maintenance.lookups.assets}
              onChange={maintenance.updateScheduleFilter}
            />
          )}
        </div>

        {maintenance.error ? (
          <ErrorState title="Maintenance data unavailable" description={maintenance.error} onRetry={() => maintenance.refresh()} />
        ) : null}
        {actionError ? <ErrorState title="Maintenance action failed" description={actionError} /> : null}

        <section className="secure-data-panel">
          {maintenance.isLoading ? (
            <LoadingState variant="table" description="Loading maintenance workspace..." />
          ) : activeTab === 'records' ? (
            <MaintenanceList
              records={maintenance.records}
              canManage={canManageMaintenance}
              onEdit={openRecordModal}
              onComplete={async (record) => {
                setActionError('');
                try {
                  await maintenance.completeMaintenance(record.maintenance_id, buildCompletionPayload(record));
                  showToast({ tone: 'success', title: `Maintenance #${record.maintenance_id} completed` });
                } catch (err) {
                  setActionError(err.message || 'Failed to complete maintenance record.');
                }
              }}
            />
          ) : (
            <ScheduleList
              schedules={maintenance.schedules}
              canManage={canEditSchedules}
              onEdit={openScheduleModal}
            />
          )}
        </section>
      </div>

      <MaintenanceFormModal
        open={recordModalOpen}
        record={editingRecord}
        assets={maintenance.lookups.assets}
        staff={maintenance.lookups.staff}
        schedules={maintenance.allSchedules}
        onClose={() => setRecordModalOpen(false)}
        onSubmit={handleRecordSubmit}
        isSubmitting={maintenance.isSubmitting}
      />

      <ScheduleFormModal
        open={scheduleModalOpen}
        schedule={editingSchedule}
        assets={maintenance.lookups.assets}
        staff={maintenance.lookups.staff}
        onClose={() => setScheduleModalOpen(false)}
        onSubmit={handleScheduleSubmit}
        isSubmitting={maintenance.isSubmitting}
      />
    </SecureWorkspaceLayout>
  );
}
