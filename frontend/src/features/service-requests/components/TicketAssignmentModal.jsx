import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';

function toInputDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
}

export function TicketAssignmentModal({
  open,
  ticket,
  technicians,
  onClose,
  onSubmit,
}) {
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [expectedCompletionAt, setExpectedCompletionAt] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setAssignedTechnicianId(ticket.assigned_technician_id || '');
    setExpectedCompletionAt(toInputDateTime(ticket.expected_completion_at));
    setAssignmentNote('');
    setErrorMessage('');
  }, [ticket, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSubmit({
        assigned_technician_id: assignedTechnicianId || null,
        assignment_note: assignmentNote.trim(),
        expected_completion_at: expectedCompletionAt || null,
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
      title={ticket?.assigned_technician_id ? 'Reassign Technician' : 'Assign Technician'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="ticket-assignment-form" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Assignment'}
          </Button>
        </>
      }
    >
      <form id="ticket-assignment-form" className="ui-stack-md" onSubmit={handleSubmit}>
        <FormField label="Technician" htmlFor="assign-technician">
          <select
            id="assign-technician"
            className="ui-input"
            value={assignedTechnicianId}
            onChange={(event) => setAssignedTechnicianId(event.target.value)}
          >
            <option value="">Unassigned</option>
            {technicians.map((technician) => (
              <option key={technician.user_id} value={technician.user_id}>
                {technician.full_name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Expected Completion" htmlFor="assign-expected">
          <input
            id="assign-expected"
            className="ui-input"
            type="datetime-local"
            value={expectedCompletionAt}
            onChange={(event) => setExpectedCompletionAt(event.target.value)}
          />
        </FormField>

        <FormField label="Assignment Note" htmlFor="assign-note" error={errorMessage}>
          <textarea
            id="assign-note"
            className="ui-input"
            rows={4}
            value={assignmentNote}
            placeholder="Optional note for the assignee"
            onChange={(event) => setAssignmentNote(event.target.value)}
          />
        </FormField>
      </form>
    </Modal>
  );
}
