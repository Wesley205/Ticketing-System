import { useMemo, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';

function buildTicketResolutionPayload(form) {
  const noteParts = [
    form.diagnosis && `Diagnosis: ${form.diagnosis.trim()}`,
    form.rootCause && `Root Cause: ${form.rootCause.trim()}`,
    form.timeSpent && `Time Spent: ${form.timeSpent.trim()}`,
  ].filter(Boolean);

  return {
    status: form.status,
    resolution: form.resolution.trim(),
    note: noteParts.join(' | '),
  };
}

function buildMaintenanceResolutionPayload(form) {
  const notes = [
    form.diagnosis && `Diagnosis: ${form.diagnosis.trim()}`,
    form.rootCause && `Root Cause: ${form.rootCause.trim()}`,
    form.timeSpent && `Time Spent: ${form.timeSpent.trim()}`,
    form.maintenanceNotes && `Notes: ${form.maintenanceNotes.trim()}`,
  ].filter(Boolean).join(' | ');

  return {
    status: form.status,
    action_taken: form.resolution.trim(),
    completion_notes: form.resolution.trim(),
    notes,
  };
}

export function ResolutionForm({
  mode = 'ticket',
  allowedStatuses = [],
  onSubmit,
  isSubmitting = false,
}) {
  const [form, setForm] = useState({
    status: '',
    diagnosis: '',
    resolution: '',
    timeSpent: '',
    rootCause: '',
    maintenanceNotes: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const availableStatuses = useMemo(
    () => allowedStatuses.filter(Boolean),
    [allowedStatuses]
  );

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.status) {
      setErrorMessage('Choose a target status first.');
      return;
    }

    if (!form.resolution.trim()) {
      setErrorMessage('Enter a resolution summary before submitting.');
      return;
    }

    setErrorMessage('');

    try {
      await onSubmit(mode === 'maintenance'
        ? buildMaintenanceResolutionPayload(form)
        : buildTicketResolutionPayload(form));
      setForm({
        status: '',
        diagnosis: '',
        resolution: '',
        timeSpent: '',
        rootCause: '',
        maintenanceNotes: '',
      });
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to submit the resolution.').message);
    }
  }

  return (
    <form className="ui-stack-md" onSubmit={handleSubmit}>
      <div className="ui-grid-2">
        <FormField label="Target Status" htmlFor={`resolution-status-${mode}`}>
          <select
            id={`resolution-status-${mode}`}
            className="ui-input"
            value={form.status}
            onChange={(event) => updateField('status', event.target.value)}
          >
            <option value="">Choose status...</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Time Spent" htmlFor={`resolution-time-${mode}`} hint="Example: 45 minutes">
          <input
            id={`resolution-time-${mode}`}
            className="ui-input"
            value={form.timeSpent}
            onChange={(event) => updateField('timeSpent', event.target.value)}
          />
        </FormField>
      </div>

      <div className="ui-grid-2">
        <FormField label="Diagnosis" htmlFor={`resolution-diagnosis-${mode}`}>
          <textarea
            id={`resolution-diagnosis-${mode}`}
            className="ui-input"
            rows={3}
            value={form.diagnosis}
            onChange={(event) => updateField('diagnosis', event.target.value)}
          />
        </FormField>

        <FormField label="Root Cause" htmlFor={`resolution-root-${mode}`}>
          <textarea
            id={`resolution-root-${mode}`}
            className="ui-input"
            rows={3}
            value={form.rootCause}
            onChange={(event) => updateField('rootCause', event.target.value)}
          />
        </FormField>
      </div>

      {mode === 'maintenance' ? (
        <FormField label="Maintenance Notes" htmlFor="resolution-maintenance-notes">
          <textarea
            id="resolution-maintenance-notes"
            className="ui-input"
            rows={3}
            value={form.maintenanceNotes}
            onChange={(event) => updateField('maintenanceNotes', event.target.value)}
          />
        </FormField>
      ) : null}

      <FormField
        label="Resolution Summary"
        htmlFor={`resolution-summary-${mode}`}
        error={errorMessage}
      >
        <textarea
          id={`resolution-summary-${mode}`}
          className="ui-input"
          rows={4}
          value={form.resolution}
          onChange={(event) => updateField('resolution', event.target.value)}
        />
      </FormField>

      <div className="ui-inline-actions">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Submit Resolution'}
        </Button>
      </div>
    </form>
  );
}
