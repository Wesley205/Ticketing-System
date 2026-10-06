export function ticketSlaState(ticket = {}) {
  const sla = ticket.sla || {};
  const rawLabel = String(ticket.sla_target || ticket.sla_status || ticket.slaLabel || '').trim().toLowerCase();
  const dueValue = ticket.sla_resolution_due_at || ticket.expected_completion_at || ticket.sla_response_due_at;
  const due = dueValue ? new Date(dueValue) : null;
  const isDueValid = due && !Number.isNaN(due.getTime());
  const isPastDue = isDueValid && due.getTime() < Date.now();
  const isWarningSoon = isDueValid && due.getTime() - Date.now() <= 60 * 60 * 1000;

  if (
    ticket.isOverdue ||
    sla.resolutionOverdue ||
    sla.expectedCompletionOverdue ||
    rawLabel.includes('breach') ||
    rawLabel.includes('overdue') ||
    isPastDue
  ) {
    return { label: 'Overdue', tone: 'danger' };
  }

  if (
    sla.warning ||
    sla.responseWarning ||
    sla.resolutionWarning ||
    sla.expectedCompletionWarning ||
    sla.responseOverdue ||
    rawLabel.includes('warning') ||
    rawLabel.includes('risk') ||
    isWarningSoon
  ) {
    return { label: 'Warning', tone: 'warning' };
  }

  return { label: 'On track', tone: 'success' };
}
