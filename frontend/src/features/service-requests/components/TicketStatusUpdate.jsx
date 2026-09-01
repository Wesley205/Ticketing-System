import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';

export function TicketStatusUpdate({
  allowedStatuses = [],
  canUpdate = false,
  onSubmit,
  isSubmitting = false,
}) {
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!canUpdate) {
    return <p className="react-copy">Status changes are not available for your current access on this ticket.</p>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!status) {
      setErrorMessage('Choose a target status first.');
      return;
    }

    setErrorMessage('');

    try {
      await onSubmit({
        status,
        note: note.trim(),
        resolution: resolution.trim(),
      });
      setStatus('');
      setNote('');
      setResolution('');
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to update the ticket status.').message);
    }
  }

  return (
    <form className="ui-stack-md" onSubmit={handleSubmit}>
      <div className="ticket-inline-grid">
        <FormField label="Change Status" htmlFor="detail-status-select">
          <select
            id="detail-status-select"
            className="ui-input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Change status...</option>
            {allowedStatuses.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </FormField>
        <div className="ticket-status-action">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Apply'}
          </Button>
        </div>
      </div>

      <FormField label="Status Note" htmlFor="detail-status-note" error={errorMessage}>
        <textarea
          id="detail-status-note"
          className="ui-input"
          rows={3}
          placeholder="Status note, reopen reason, cancellation reason, or resolution context"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </FormField>

      <FormField label="Resolution" htmlFor="detail-status-resolution">
        <textarea
          id="detail-status-resolution"
          className="ui-input"
          rows={3}
          placeholder="Resolution text when resolving or closing"
          value={resolution}
          onChange={(event) => setResolution(event.target.value)}
        />
      </FormField>
    </form>
  );
}
