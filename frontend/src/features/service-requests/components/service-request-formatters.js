import { formatDateTime, humanizeStatus } from '../../../lib/formatting.js';

const ONE_MINUTE = 60 * 1000;

export function ticketId(ticket = {}) {
  return ticket.ticket_number || `#${ticket.request_id || ''}`;
}

export function formatRelativeTime(value, now = new Date()) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  const diffMinutes = Math.round((date.getTime() - now.getTime()) / ONE_MINUTE);
  const absMinutes = Math.abs(diffMinutes);
  const unitValue = absMinutes < 60 ? absMinutes : Math.round(absMinutes / 60);
  const unit = absMinutes < 60 ? 'minute' : 'hour';
  const label = `${unitValue} ${unit}${unitValue === 1 ? '' : 's'}`;

  if (diffMinutes === 0) return 'Just now';
  return diffMinutes > 0 ? `in ${label}` : `${label} ago`;
}

export function formatSla(ticket = {}, now = new Date()) {
  const sla = ticket.sla || {};
  const rawDeadline = sla.resolution_due_at || ticket.sla_resolution_due_at || ticket.expected_completion_at;

  if (!sla.policy_name && !rawDeadline) {
    return {
      tone: 'neutral',
      label: 'No SLA policy assigned',
      detail: 'No deadline is available for this request.',
      deadline: '',
    };
  }

  const deadline = new Date(rawDeadline);
  if (Number.isNaN(deadline.getTime())) {
    return {
      tone: 'neutral',
      label: 'SLA unavailable',
      detail: 'The SLA deadline could not be read.',
      deadline: '',
    };
  }

  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return {
      tone: 'success',
      label: 'Response target met',
      detail: sla.policy_name || 'SLA completed',
      deadline: formatDateTime(deadline),
    };
  }

  const diffMinutes = Math.round((deadline.getTime() - now.getTime()) / ONE_MINUTE);
  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const compact = hours ? `${hours}h ${minutes}m` : `${minutes} minutes`;

  if (diffMinutes < 0) {
    return {
      tone: 'danger',
      label: `Overdue by ${compact}`,
      detail: sla.policy_name || 'Resolution SLA breached',
      deadline: formatDateTime(deadline),
    };
  }

  return {
    tone: diffMinutes <= 60 ? 'warning' : 'success',
    label: diffMinutes <= 60 ? `SLA due in ${compact}` : `Due in ${compact}`,
    detail: sla.policy_name || 'Resolution target active',
    deadline: formatDateTime(deadline),
  };
}

export function eventTitle(entry = {}) {
  const type = String(entry.event_type || '').replace(/_/g, ' ').trim();
  if (!type) return 'Ticket event';
  if (entry.from_status && entry.to_status) {
    return `Status changed from ${entry.from_status} to ${entry.to_status}`;
  }
  return humanizeStatus(type).replace(/^\w/, (char) => char.toUpperCase());
}

export function recommendedAction(ticket = {}) {
  const transitions = ticket.permissions?.allowed_status_transitions || ticket.allowed_status_transitions || [];
  const priority = ['Accepted', 'In Progress', 'Resolved', 'Closed', 'Reopened', 'Assigned', 'Pending', 'Cancelled'];
  return priority.find((status) => transitions.includes(status)) || '';
}
