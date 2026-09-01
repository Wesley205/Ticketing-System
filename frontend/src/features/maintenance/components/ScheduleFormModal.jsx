import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import {
  MAINTENANCE_FREQUENCY_UNITS,
  MAINTENANCE_SCHEDULE_TYPES,
  getChecklistItems,
} from '../services/maintenance-api.js';

function toDateTimeInput(value) {
  if (!value) return '';
  return String(value).slice(0, 16);
}

function buildInitialForm(schedule) {
  return {
    asset_id: schedule?.asset_id || '',
    title: schedule?.title || '',
    description: schedule?.description || '',
    maintenance_type: schedule?.maintenance_type || 'Preventive',
    frequency_unit: schedule?.frequency_unit || 'days',
    frequency_value: schedule?.frequency_value || 30,
    next_due_at: toDateTimeInput(schedule?.next_due_at),
    assigned_technician_id: schedule?.assigned_technician_id || '',
    reminder_days_before: schedule?.reminder_days_before ?? 3,
    checklist_items: getChecklistItems(schedule).join(', '),
    is_active: schedule?.is_active === false ? 'false' : 'true',
  };
}

export function ScheduleFormModal({
  open,
  schedule = null,
  assets = [],
  staff = [],
  onClose,
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState(buildInitialForm(schedule));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(schedule));
      setError('');
    }
  }, [open, schedule?.schedule_id]);

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
    if (!form.title.trim()) {
      setError('Schedule title is required.');
      return;
    }
    if (!form.next_due_at) {
      setError('Next due date is required.');
      return;
    }

    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save maintenance schedule.');
    }
  }

  return (
    <Modal
      open={open}
      title={schedule ? `Edit Schedule - ${schedule.title}` : 'New Maintenance Schedule'}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('schedule-form-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Schedule'}
          </Button>
        </>
      )}
    >
      <form className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Asset *" htmlFor="schedule-form-asset" error={error}>
          <select
            id="schedule-form-asset"
            className="ui-input"
            value={form.asset_id}
            onChange={(event) => updateField('asset_id', event.target.value)}
            disabled={Boolean(schedule)}
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

        <FormField label="Title *" htmlFor="schedule-form-title">
          <input id="schedule-form-title" className="ui-input" value={form.title} onChange={(event) => updateField('title', event.target.value)} required />
        </FormField>

        <FormField label="Description" htmlFor="schedule-form-description">
          <textarea id="schedule-form-description" className="ui-input" rows={3} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
        </FormField>

        <div className="ui-grid-2">
          <FormField label="Schedule Type" htmlFor="schedule-form-type">
            <select id="schedule-form-type" className="ui-input" value={form.maintenance_type} onChange={(event) => updateField('maintenance_type', event.target.value)}>
              {MAINTENANCE_SCHEDULE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </FormField>

          <FormField label="Frequency Unit" htmlFor="schedule-form-frequency-unit">
            <select id="schedule-form-frequency-unit" className="ui-input" value={form.frequency_unit} onChange={(event) => updateField('frequency_unit', event.target.value)}>
              {MAINTENANCE_FREQUENCY_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </FormField>

          <FormField label="Frequency Value" htmlFor="schedule-form-frequency-value">
            <input id="schedule-form-frequency-value" type="number" min="1" className="ui-input" value={form.frequency_value} onChange={(event) => updateField('frequency_value', event.target.value)} />
          </FormField>

          <FormField label="Next Due *" htmlFor="schedule-form-next-due">
            <input id="schedule-form-next-due" type="datetime-local" className="ui-input" value={form.next_due_at} onChange={(event) => updateField('next_due_at', event.target.value)} required />
          </FormField>

          <FormField label="Assigned Technician" htmlFor="schedule-form-technician">
            <select id="schedule-form-technician" className="ui-input" value={form.assigned_technician_id} onChange={(event) => updateField('assigned_technician_id', event.target.value)}>
              <option value="">Unassigned</option>
              {staff.filter((user) => user.role === 'technician').map((user) => (
                <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Reminder Days Before" htmlFor="schedule-form-reminder">
            <input id="schedule-form-reminder" type="number" min="0" className="ui-input" value={form.reminder_days_before} onChange={(event) => updateField('reminder_days_before', event.target.value)} />
          </FormField>

          <FormField label="Schedule State" htmlFor="schedule-form-state">
            <select id="schedule-form-state" className="ui-input" value={form.is_active} onChange={(event) => updateField('is_active', event.target.value)}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </FormField>
        </div>

        <FormField label="Checklist Items" htmlFor="schedule-form-checklist" hint="Comma-separated, preserved as backend checklist_items array.">
          <input id="schedule-form-checklist" className="ui-input" value={form.checklist_items} onChange={(event) => updateField('checklist_items', event.target.value)} />
        </FormField>

        <button id="schedule-form-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
