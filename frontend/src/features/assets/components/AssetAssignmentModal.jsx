import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';

export function AssetAssignmentModal({
  open,
  asset,
  staff = [],
  onClose,
  onSubmit,
}) {
  const [assignedTo, setAssignedTo] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [expectedReturnAt, setExpectedReturnAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAssignedTo(asset?.assigned_to || '');
    setAssignmentNotes('');
    setExpectedReturnAt('');
    setErrorMessage('');
  }, [asset, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      await onSubmit({
        assigned_to: assignedTo || null,
        assignment_notes: assignmentNotes.trim() || null,
        expected_return_at: expectedReturnAt || null,
      });
      onClose();
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to save the assignment.').message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={asset?.assigned_to ? `Reassign ${asset.asset_tag}` : `Assign ${asset?.asset_tag || 'asset'}`}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => document.getElementById('asset-assignment-submit')?.click()} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Assignment'}
          </Button>
        </>
      )}
    >
      <form className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Assign To" htmlFor="asset-assignment-user" error={errorMessage}>
          <select
            id="asset-assignment-user"
            className="ui-input"
            value={assignedTo}
            onChange={(event) => setAssignedTo(event.target.value)}
          >
            <option value="">Unassigned</option>
            {staff.map((person) => (
              <option key={person.user_id} value={person.user_id}>{person.full_name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Assignment Notes" htmlFor="asset-assignment-notes">
          <textarea
            id="asset-assignment-notes"
            className="ui-input"
            rows={3}
            value={assignmentNotes}
            onChange={(event) => setAssignmentNotes(event.target.value)}
          />
        </FormField>

        <FormField label="Expected Return" htmlFor="asset-assignment-expected-return">
          <input
            id="asset-assignment-expected-return"
            type="datetime-local"
            className="ui-input"
            value={expectedReturnAt}
            onChange={(event) => setExpectedReturnAt(event.target.value)}
          />
        </FormField>

        <button id="asset-assignment-submit" type="submit" hidden />
      </form>
    </Modal>
  );
}
