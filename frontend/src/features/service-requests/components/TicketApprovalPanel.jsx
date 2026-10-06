import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';

const APPROVAL_LABELS = {
  pending: 'Awaiting approval',
  approved: 'Approved',
  rejected: 'Rejected',
  not_required: 'Not required',
};

export function TicketApprovalPanel({ ticket, onDecision, isSubmitting = false }) {
  const [note, setNote] = useState('');
  const status = ticket?.approval_status || 'not_required';
  if (status === 'not_required' && !ticket?.catalog_item_id) return null;

  async function decide(decision) {
    if (decision === 'rejected' && !note.trim()) return;
    await onDecision?.({ decision, note: note.trim() || null });
    setNote('');
  }

  return (
    <section className={`ticket-approval-panel ticket-approval-${status}`}>
      <div>
        <span>Approval</span>
        <strong>{APPROVAL_LABELS[status] || status}</strong>
        <p>
          {status === 'pending'
            ? `This request must be approved by ${String(ticket.approval_role || 'an authorized officer').replaceAll('_', ' ')} before assignment.`
            : ticket.approval_note || `This request is ${APPROVAL_LABELS[status]?.toLowerCase()}.`}
        </p>
      </div>
      {ticket.permissions?.can_approve && status === 'pending' ? (
        <div className="ticket-approval-actions">
          <textarea
            className="ui-input"
            rows={3}
            value={note}
            placeholder="Decision note (required when rejecting)"
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="ui-inline-actions responsive-action-row">
            <Button size="sm" onClick={() => decide('approved')} disabled={isSubmitting}>Approve</Button>
            <Button size="sm" variant="danger" onClick={() => decide('rejected')} disabled={isSubmitting || !note.trim()}>Reject</Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
