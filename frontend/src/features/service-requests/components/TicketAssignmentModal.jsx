import { useEffect, useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { Modal } from '../../../components/modals/Modal.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { technicianAvailability } from '../services/service-requests-api.js';

function toInputDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
}

export function TicketAssignmentModal({
  open,
  ticket,
  technicians = [],
  workloadCounts = {},
  onClose,
  onSubmit,
}) {
  const [assignedTechnicianId, setAssignedTechnicianId] = useState('');
  const [search, setSearch] = useState('');
  const [expectedCompletionAt, setExpectedCompletionAt] = useState('');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    setAssignedTechnicianId(ticket.assigned_technician_id || '');
    setSearch('');
    setExpectedCompletionAt(toInputDateTime(ticket.expected_completion_at));
    setAssignmentNote('');
    setErrorMessage('');
  }, [ticket, open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    if (!assignedTechnicianId) {
      setErrorMessage('Please select a technician to continue.');
      setIsSubmitting(false);
      return;
    }

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

  const visibleTechnicians = technicians.filter((technician) =>
    [technician.full_name, technician.email, technician.username]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <Modal
      open={open}
      title={ticket?.assigned_technician_id ? 'Reassign Ticket' : 'Assign Ticket'}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="ticket-assignment-form" disabled={isSubmitting}>
            {isSubmitting ? 'Assigning...' : 'Assign Ticket'}
          </Button>
        </>
      }
    >
      <form id="ticket-assignment-form" className="assignment-secure-form" onSubmit={handleSubmit}>
        <div className="assignment-ticket-head">
          <strong>{ticket?.ticket_number || `#${ticket?.request_id || ''}`}</strong>
          <p>Choose a technician, set expected completion, and add handoff notes.</p>
        </div>

        <FormField label="Search technician" htmlFor="assign-technician-search" error={errorMessage}>
          <input
            id="assign-technician-search"
            className="ui-input"
            value={search}
            placeholder="Search and select technician name..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </FormField>

        <section className="assignment-technician-list" aria-label="Available technicians">
          {visibleTechnicians.map((technician) => {
            const availability = technicianAvailability(technician, workloadCounts);
            const selected = String(assignedTechnicianId) === String(technician.user_id);
            return (
              <button
                type="button"
                key={technician.user_id}
                className={selected ? 'assignment-technician-option active' : 'assignment-technician-option'}
                onClick={() => setAssignedTechnicianId(technician.user_id)}
              >
                <span aria-hidden="true" />
                <strong>{technician.full_name}</strong>
                <small>{availability.label}</small>
                <b>{availability.state}</b>
              </button>
            );
          })}
        </section>

        <FormField label="Expected Completion" htmlFor="assign-expected">
          <input
            id="assign-expected"
            className="ui-input"
            type="datetime-local"
            value={expectedCompletionAt}
            onChange={(event) => setExpectedCompletionAt(event.target.value)}
          />
        </FormField>

        <FormField label="Assignment Note" htmlFor="assign-note">
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
