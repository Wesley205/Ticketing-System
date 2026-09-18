import { Button } from '../../../components/forms/Button.jsx';
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
    Unavailable: 'Unavailable',
    Cancelled: 'Cancel ticket',
    'Waiting for User': 'Wait for requester',
    'Waiting for Parts': 'Wait for parts',
  }[status] || status;
}

function buildWorkflowActions(ticket = {}) {
  const transitions = ticket?.permissions?.allowed_status_transitions || ticket.allowed_status_transitions || [];
  const status = ticket?.status || '';
  const hasTransition = (nextStatus) => transitions.includes(nextStatus);

  if (status === 'Assigned') {
    return [
      hasTransition('Accepted') ? { label: 'Accept', status: 'Accepted', variant: 'primary' } : null,
      hasTransition('Pending') ? { label: 'Unavailable', status: 'Pending', note: 'Technician marked unavailable for this assigned ticket.', variant: 'secondary' } : null,
    ].filter(Boolean);
  }

  if (status === 'Accepted') {
    return hasTransition('In Progress')
      ? [{ label: 'Start work', status: 'In Progress', variant: 'primary' }]
      : [];
  }

  if (status === 'In Progress') {
    return [
      hasTransition('Waiting for User') ? { label: 'Waiting for user', status: 'Waiting for User', variant: 'secondary' } : null,
      hasTransition('Waiting for Parts') ? { label: 'Waiting for parts', status: 'Waiting for Parts', variant: 'secondary' } : null,
      hasTransition('Resolved') ? { label: 'Resolve ticket', status: 'Resolved', variant: 'primary' } : null,
    ].filter(Boolean);
  }

  if (status === 'Waiting for User' || status === 'Waiting for Parts') {
    return hasTransition('In Progress')
      ? [{ label: 'Resume work', status: 'In Progress', variant: 'primary' }]
      : [];
  }

  if (status === 'Resolved') {
    return [
      hasTransition('Closed') ? { label: 'Confirm closure', status: 'Closed', variant: 'primary' } : null,
      hasTransition('Reopened') ? { label: 'Reopen ticket', status: 'Reopened', variant: 'secondary' } : null,
    ].filter(Boolean);
  }

  return transitions.map((nextStatus) => ({
    label: actionLabel(nextStatus),
    status: nextStatus,
    variant: nextStatus === 'Cancelled' ? 'danger' : 'secondary',
  }));
}

export function TicketActionCenter({ ticket, isAdmin = false, canAssign = false, onAssignOpen, onStatusSubmit, isMutating = false }) {
  const workflowActions = buildWorkflowActions(ticket);

  function submitStatus(action) {
    const status = action.status;
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

    onStatusSubmit({ status, note: action.note || `${action.label || actionLabel(status)} selected.` });
  }

  return (
    <section className="service-request-action-center">
      <SlaIndicator ticket={ticket} />
      <div className="service-request-action-owner">
        <span>Assignee</span>
        <strong>{ticket?.technician_name || 'Unassigned'}</strong>
      </div>

      <div className="service-request-action-buttons">
        {workflowActions.map((action) => (
          <Button
            key={`${action.status}-${action.label}`}
            variant={action.variant}
            onClick={() => submitStatus(action)}
            disabled={isMutating}
          >
            {action.label}
          </Button>
        ))}
        {canAssign ? (
          <Button variant="secondary" onClick={onAssignOpen}>
            {ticket?.assigned_technician_id ? 'Reassign' : 'Assign technician'}
          </Button>
        ) : null}
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
