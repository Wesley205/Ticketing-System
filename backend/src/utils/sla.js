const OPEN_TICKET_STATUSES = [
  'New',
  'Pending',
  'Assigned',
  'Accepted',
  'In Progress',
  'Waiting for User',
  'Waiting for Parts',
  'Reopened',
];

function buildSlaDeadlinesFromPolicy(policy, startedAt = new Date()) {
  if (!policy) {
    return { responseDueAt: null, resolutionDueAt: null };
  }

  const base = new Date(startedAt);
  return {
    responseDueAt: new Date(base.getTime() + Number(policy.response_target_hours || 0) * 60 * 60 * 1000),
    resolutionDueAt: new Date(base.getTime() + Number(policy.resolution_target_hours || 0) * 60 * 60 * 1000),
  };
}

function selectSlaPolicy(policies, ticket) {
  if (!Array.isArray(policies) || !ticket) return null;

  const exact = policies.find(
    (policy) => policy.is_active && policy.priority === ticket.priority && policy.ticket_type === ticket.ticket_type
  );
  if (exact) return exact;

  return policies.find(
    (policy) => policy.is_active && policy.priority === ticket.priority && (policy.ticket_type === null || policy.ticket_type === undefined)
  ) || null;
}

function isOpenTicketStatus(status) {
  return OPEN_TICKET_STATUSES.includes(status);
}

function calculateSlaState(ticket, now = new Date()) {
  const currentTime = new Date(now);
  const responseDueAt = ticket?.sla_response_due_at ? new Date(ticket.sla_response_due_at) : null;
  const resolutionDueAt = ticket?.sla_resolution_due_at ? new Date(ticket.sla_resolution_due_at) : null;
  const expectedCompletionAt = ticket?.expected_completion_at ? new Date(ticket.expected_completion_at) : null;
  const firstResponseAt = ticket?.first_response_at ? new Date(ticket.first_response_at) : null;
  const terminal = ['Resolved', 'Closed', 'Cancelled'].includes(ticket?.status);

  const responseOverdue = !terminal && !firstResponseAt && responseDueAt && currentTime > responseDueAt;
  const resolutionOverdue = !terminal && resolutionDueAt && currentTime > resolutionDueAt;
  const expectedCompletionOverdue = !terminal && expectedCompletionAt && currentTime > expectedCompletionAt;

  return {
    responseOverdue,
    resolutionOverdue,
    expectedCompletionOverdue,
    overdue: !!(responseOverdue || resolutionOverdue || expectedCompletionOverdue),
  };
}

module.exports = {
  OPEN_TICKET_STATUSES,
  buildSlaDeadlinesFromPolicy,
  calculateSlaState,
  isOpenTicketStatus,
  selectSlaPolicy,
};
