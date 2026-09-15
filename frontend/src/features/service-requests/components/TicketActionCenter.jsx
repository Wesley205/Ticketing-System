import { Button } from '../../../components/forms/Button.jsx';
import { recommendedAction } from './service-request-formatters.js';
import { SlaIndicator } from './SlaIndicator.jsx';

function actionLabel(status) {
  return {
    Accepted: 'Accept ticket',
    'In Progress': 'Start work',
    Resolved: 'Mark resolved',
    Closed: 'Confirm closure',
    Reopened: 'Reopen ticket',
    Assigned: 'Assign technician',
    Pending: 'Move to pending',
    Cancelled: 'Cancel ticket',
    'Waiting for User': 'Wait for requester',
    'Waiting for Parts': 'Wait for parts',
  }[status] || status;
}

export function TicketActionCenter({ ticket, isAdmin = false, canAssign = false, onAssignOpen, onStatusSubmit, isMutating = false }) {
  const transitions = ticket?.permissions?.allowed_status_transitions || [];
  const primaryStatus = recommendedAction(ticket);
  const secondary = transitions.filter((status) => status !== primaryStatus);

  function submitStatus(status) {
    if (status === 'Cancelled' && !window.confirm('Cancel this ticket? This is an exceptional workflow action.')) {
      return;
    }

    if (status === 'Resolved' || status === 'Closed') {
      const resolution = window.prompt('Enter resolution summary.');
      if (!resolution?.trim()) return;
      onStatusSubmit({ status, resolution: resolution.trim(), note: `${actionLabel(status)} selected.` });
      return;
    }

    if (status === 'Reopened' || status === 'Cancelled') {
      const note = window.prompt(status === 'Reopened' ? 'Enter reopen reason.' : 'Enter cancellation reason.');
      if (!note?.trim()) return;
      onStatusSubmit({ status, note: note.trim() });
      return;
    }

    onStatusSubmit({ status, note: `${actionLabel(status)} selected.` });
  }

  return (
    <section className="service-request-action-center">
      <SlaIndicator ticket={ticket} />
      <div className="service-request-action-owner">
        <span>Assignee</span>
        <strong>{ticket?.technician_name || 'Unassigned'}</strong>
      </div>

      <div className="service-request-action-buttons">
        {primaryStatus ? (
          <Button onClick={() => submitStatus(primaryStatus)} disabled={isMutating}>
            {actionLabel(primaryStatus)}
          </Button>
        ) : null}
        {canAssign ? (
          <Button variant="secondary" onClick={onAssignOpen}>
            {ticket?.assigned_technician_id ? 'Reassign' : 'Assign technician'}
          </Button>
        ) : null}
        {secondary.map((status) => (
          <Button key={status} variant={status === 'Cancelled' ? 'danger' : 'secondary'} onClick={() => submitStatus(status)} disabled={isMutating}>
            {actionLabel(status)}
          </Button>
        ))}
      </div>

      {isAdmin ? (
        <details className="service-request-admin-overrides">
          <summary>Administrator overrides</summary>
          <p>Use override actions only when standard workflow handling is not sufficient.</p>
        </details>
      ) : null}
    </section>
  );
}
