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

const DEFAULT_SLA_WARNING_PERCENT = 75;
const DEFAULT_SLA_WARNING_THRESHOLDS = Object.freeze([50, 75, 90]);

function normalizeWarningPercent(value = DEFAULT_SLA_WARNING_PERCENT) {
  const percent = Number(value);
  return Number.isFinite(percent) && percent > 0 && percent < 100
    ? percent
    : DEFAULT_SLA_WARNING_PERCENT;
}

function isDeadlineWarning(startedAt, dueAt, now, warningPercent) {
  if (!startedAt || !dueAt) return false;

  const start = new Date(startedAt);
  const due = new Date(dueAt);
  const current = new Date(now);
  if ([start, due, current].some((value) => Number.isNaN(value.getTime())) || due <= start) {
    return false;
  }

  const warningAt = new Date(
    start.getTime() + ((due.getTime() - start.getTime()) * normalizeWarningPercent(warningPercent)) / 100
  );
  return current >= warningAt && current <= due;
}

function deadlineProgressPercent(startedAt, dueAt, now = new Date()) {
  if (!startedAt || !dueAt) return 0;
  const start = new Date(startedAt);
  const due = new Date(dueAt);
  const current = new Date(now);
  if ([start, due, current].some((value) => Number.isNaN(value.getTime())) || due <= start) return 0;
  return Math.max(0, Math.round(((current.getTime() - start.getTime()) / (due.getTime() - start.getTime())) * 100));
}

function reachedWarningLevel(startedAt, dueAt, now, thresholds = DEFAULT_SLA_WARNING_THRESHOLDS) {
  const dueDate = dueAt ? new Date(dueAt) : null;
  const current = new Date(now);
  if (!dueDate || Number.isNaN(dueDate.getTime()) || current > dueDate) return 0;
  const progress = deadlineProgressPercent(startedAt, dueAt, current);
  return [...thresholds]
    .map(Number)
    .filter((threshold) => Number.isFinite(threshold) && threshold > 0 && threshold < 100 && progress >= threshold)
    .sort((left, right) => right - left)[0] || 0;
}

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

function calculateSlaState(ticket, now = new Date(), options = {}) {
  const currentTime = new Date(now);
  const warningPercent = normalizeWarningPercent(options.warningPercent);
  const startedAt = ticket?.date_submitted || ticket?.created_at || null;
  const responseDueAt = ticket?.sla_response_due_at ? new Date(ticket.sla_response_due_at) : null;
  const resolutionDueAt = ticket?.sla_resolution_due_at ? new Date(ticket.sla_resolution_due_at) : null;
  const expectedCompletionAt = ticket?.expected_completion_at ? new Date(ticket.expected_completion_at) : null;
  const expectedCompletionStartedAt = ticket?.assigned_at || startedAt;
  const firstResponseAt = ticket?.first_response_at ? new Date(ticket.first_response_at) : null;
  const terminal = ['Resolved', 'Closed', 'Cancelled'].includes(ticket?.status);
  const warningThresholds = Array.isArray(options.warningThresholds)
    ? options.warningThresholds
    : options.warningPercent
      ? [normalizeWarningPercent(options.warningPercent)]
      : DEFAULT_SLA_WARNING_THRESHOLDS;

  const responseOverdue = !terminal && !firstResponseAt && responseDueAt && currentTime > responseDueAt;
  const resolutionOverdue = !terminal && resolutionDueAt && currentTime > resolutionDueAt;
  const expectedCompletionOverdue = !terminal && expectedCompletionAt && currentTime > expectedCompletionAt;
  const responseWarning = !terminal && !firstResponseAt && !responseOverdue && isDeadlineWarning(
    startedAt,
    responseDueAt,
    currentTime,
    warningPercent
  );
  const resolutionWarning = !terminal && !resolutionOverdue && isDeadlineWarning(
    startedAt,
    resolutionDueAt,
    currentTime,
    warningPercent
  );
  const expectedCompletionWarning = !terminal && !expectedCompletionOverdue && isDeadlineWarning(
    expectedCompletionStartedAt,
    expectedCompletionAt,
    currentTime,
    warningPercent
  );
  const responseWarningLevel = !terminal && !firstResponseAt
    ? reachedWarningLevel(startedAt, responseDueAt, currentTime, warningThresholds)
    : 0;
  const resolutionWarningLevel = !terminal
    ? reachedWarningLevel(startedAt, resolutionDueAt, currentTime, warningThresholds)
    : 0;
  const expectedCompletionWarningLevel = !terminal
    ? reachedWarningLevel(expectedCompletionStartedAt, expectedCompletionAt, currentTime, warningThresholds)
    : 0;

  return {
    warningPercent,
    responseWarning: responseWarning || responseWarningLevel > 0,
    resolutionWarning: resolutionWarning || resolutionWarningLevel > 0,
    expectedCompletionWarning: expectedCompletionWarning || expectedCompletionWarningLevel > 0,
    responseWarningLevel,
    resolutionWarningLevel,
    expectedCompletionWarningLevel,
    warning: !!(responseWarningLevel || resolutionWarningLevel || expectedCompletionWarningLevel),
    responseOverdue,
    resolutionOverdue,
    expectedCompletionOverdue,
    overdue: !!(responseOverdue || resolutionOverdue || expectedCompletionOverdue),
  };
}

module.exports = {
  DEFAULT_SLA_WARNING_THRESHOLDS,
  DEFAULT_SLA_WARNING_PERCENT,
  OPEN_TICKET_STATUSES,
  buildSlaDeadlinesFromPolicy,
  calculateSlaState,
  isDeadlineWarning,
  deadlineProgressPercent,
  isOpenTicketStatus,
  normalizeWarningPercent,
  reachedWarningLevel,
  selectSlaPolicy,
};
