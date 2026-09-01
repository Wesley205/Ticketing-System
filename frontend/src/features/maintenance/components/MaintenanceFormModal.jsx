import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import {
  ASSET_STATUS_OVERRIDES,
  MAINTENANCE_STATUSES,
  MAINTENANCE_TYPES,
  getChecklistItems,
} from '../services/maintenance-api.js';

function toDateInput(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

function toDateTimeInput(value) {
  if (!value) return '';
  return String(value).slice(0, 16);
}

function buildInitialForm(record) {
  return {
    asset_id: record?.asset_id || '',
    problem: record?.problem || '',
    action_taken: record?.action_taken || '',
    maintenance_type: record?.maintenance_type || 'Corrective',
    maintenance_date: toDateInput(record?.maintenance_date),
    cost: record?.cost ?? 0,
    status: record?.status || 'Scheduled',
    notes: record?.notes || '',
    technician_id: record?.technician_id || '',
    related_request_id: record?.related_request_id || '',
    schedule_id: record?.schedule_id || '',
    scheduled_start_at: toDateTimeInput(record?.scheduled_start_at),
    next_due_at: toDateTimeInput(record?.next_due_at),
    checklist_items: getChecklistItems(record).join(', '),
    completion_notes: record?.completion_notes || '',
    asset_status_override: '',
  };
}

export function MaintenanceFormModal({
  open,
  record = null,
  assets = [],
  staff = [],
  schedules = [],
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(buildInitialForm(record));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(record));
      setError('');
    }
  }, [open, record?.maintenance_id]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.asset_id) {
      setError('Choose an asset.');
      return;
    }
    if (!form.problem.trim()) {
      setError('Problem description is required.');
      return;
    }

    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save maintenance record.');
    }
  }

  return (
    <Modal
      open={open}
      title={record ? `Edit Maintenance #${record.maintenance_id}` : 'New Maintenance Record'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('maintenance-form-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Record'}
          </Button>
        </>
      )}
    >
      <form className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Asset *" htmlFor="maintenance-form-asset" error={error}>
          <select
            id="maintenance-form-asset"
            className="ui-input"
            value={form.asset_id}
            onChange={(event) => updateField('asset_id', event.target.value)}
            disabled={Boolean(record)}
            required
          >
            <option value="">Choose asset</option>
            {assets.map((asset) => (
              <option key={asset.asset_id} value={asset.asset_id}>
                {asset.asset_tag} - {asset.asset_type}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Problem *" htmlFor="maintenance-form-problem">
          <textarea
            id="maintenance-form-problem"
            className="ui-input"
            rows={3}
            value={form.problem}
            onChange={(event) => updateField('problem', event.target.value)}
            required
          />
        </FormField>

        <FormField label="Action Taken" htmlFor="maintenance-form-action">
          <textarea
            id="maintenance-form-action"
            className="ui-input"
            rows={3}
            value={form.action_taken}
            onChange={(event) => updateField('action_taken', event.target.value)}
          />
        </FormField>

        <div className="ui-grid-2">
          <FormField label="Maintenance Type" htmlFor="maintenance-form-type">
            <select id="maintenance-form-type" className="ui-input" value={form.maintenance_type} onChange={(event) => updateField('maintenance_type', event.target.value)}>
              {MAINTENANCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </FormField>

          <FormField label="Status" htmlFor="maintenance-form-status">
            <select id="maintenance-form-status" className="ui-input" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
              {MAINTENANCE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </FormField>

          <FormField label="Technician" htmlFor="maintenance-form-technician">
            <select id="maintenance-form-technician" className="ui-input" value={form.technician_id} onChange={(event) => updateField('technician_id', event.target.value)}>
              <option value="">Automatic / current user</option>
              {staff.filter((user) => user.role === 'technician').map((user) => (
                <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Maintenance Date" htmlFor="maintenance-form-date">
            <input id="maintenance-form-date" type="date" className="ui-input" value={form.maintenance_date} onChange={(event) => updateField('maintenance_date', event.target.value)} />
          </FormField>

          <FormField label="Cost" htmlFor="maintenance-form-cost">
            <input id="maintenance-form-cost" type="number" step="0.01" min="0" className="ui-input" value={form.cost} onChange={(event) => updateField('cost', event.target.value)} />
          </FormField>

          <FormField label="Schedule" htmlFor="maintenance-form-schedule">
            <select id="maintenance-form-schedule" className="ui-input" value={form.schedule_id} onChange={(event) => updateField('schedule_id', event.target.value)} disabled={Boolean(record)}>
              <option value="">No schedule link</option>
              {schedules.map((schedule) => (
                <option key={schedule.schedule_id} value={schedule.schedule_id}>{schedule.title}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Scheduled Start" htmlFor="maintenance-form-start">
            <input id="maintenance-form-start" type="datetime-local" className="ui-input" value={form.scheduled_start_at} onChange={(event) => updateField('scheduled_start_at', event.target.value)} />
          </FormField>

          <FormField label="Next Due" htmlFor="maintenance-form-next">
            <input id="maintenance-form-next" type="datetime-local" className="ui-input" value={form.next_due_at} onChange={(event) => updateField('next_due_at', event.target.value)} />
          </FormField>

          <FormField label="Related Ticket ID" htmlFor="maintenance-form-request">
            <input id="maintenance-form-request" type="number" min="1" className="ui-input" value={form.related_request_id} onChange={(event) => updateField('related_request_id', event.target.value)} disabled={Boolean(record)} />
          </FormField>

          <FormField label="Asset Status Override" htmlFor="maintenance-form-asset-status">
            <select id="maintenance-form-asset-status" className="ui-input" value={form.asset_status_override} onChange={(event) => updateField('asset_status_override', event.target.value)}>
              <option value="">Backend default</option>
              {ASSET_STATUS_OVERRIDES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Checklist Items" htmlFor="maintenance-form-checklist" hint="Comma-separated, preserved as backend checklist_items array.">
          <input id="maintenance-form-checklist" className="ui-input" value={form.checklist_items} onChange={(event) => updateField('checklist_items', event.target.value)} />
        </FormField>

        <FormField label="Completion Notes" htmlFor="maintenance-form-completion">
          <textarea id="maintenance-form-completion" className="ui-input" rows={2} value={form.completion_notes} onChange={(event) => updateField('completion_notes', event.target.value)} />
        </FormField>

        <FormField label="Notes" htmlFor="maintenance-form-notes">
          <input id="maintenance-form-notes" className="ui-input" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
        </FormField>

        <button id="maintenance-form-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
