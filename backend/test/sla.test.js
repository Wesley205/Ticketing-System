const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSlaDeadlinesFromPolicy,
  calculateSlaState,
  isOpenTicketStatus,
  selectSlaPolicy,
} = require('../src/utils/sla');

test('selectSlaPolicy prefers an exact ticket-type match over a priority fallback', () => {
  const policies = [
    { sla_policy_id: 1, is_active: true, ticket_type: null, priority: 'High' },
    { sla_policy_id: 2, is_active: true, ticket_type: 'Incident', priority: 'High' },
  ];

  const selected = selectSlaPolicy(policies, { ticket_type: 'Incident', priority: 'High' });
  assert.equal(selected.sla_policy_id, 2);
});

test('buildSlaDeadlinesFromPolicy calculates response and resolution due times', () => {
  const deadlines = buildSlaDeadlinesFromPolicy(
    { response_target_hours: 2, resolution_target_hours: 10 },
    new Date('2026-08-25T08:00:00Z')
  );

  assert.equal(deadlines.responseDueAt.toISOString(), '2026-08-25T10:00:00.000Z');
  assert.equal(deadlines.resolutionDueAt.toISOString(), '2026-08-25T18:00:00.000Z');
});

test('calculateSlaState detects overdue response, resolution, and expected completion', () => {
  const state = calculateSlaState(
    {
      status: 'In Progress',
      first_response_at: null,
      sla_response_due_at: '2026-08-25T08:00:00Z',
      sla_resolution_due_at: '2026-08-25T09:00:00Z',
      expected_completion_at: '2026-08-25T09:30:00Z',
    },
    new Date('2026-08-25T10:00:00Z')
  );

  assert.equal(state.responseOverdue, true);
  assert.equal(state.resolutionOverdue, true);
  assert.equal(state.expectedCompletionOverdue, true);
  assert.equal(state.overdue, true);
});

test('calculateSlaState warns once the configured SLA percentage has elapsed', () => {
  const state = calculateSlaState(
    {
      status: 'Assigned',
      date_submitted: '2026-08-25T08:00:00Z',
      assigned_at: '2026-08-25T08:00:00Z',
      first_response_at: null,
      sla_response_due_at: '2026-08-25T12:00:00Z',
      sla_resolution_due_at: '2026-08-25T16:00:00Z',
      expected_completion_at: '2026-08-25T12:00:00Z',
    },
    new Date('2026-08-25T11:15:00Z'),
    { warningPercent: 75 }
  );

  assert.equal(state.responseWarning, true);
  assert.equal(state.resolutionWarning, false);
  assert.equal(state.expectedCompletionWarning, true);
  assert.equal(state.warning, true);
  assert.equal(state.overdue, false);
});

test('calculateSlaState suppresses response warnings after first response', () => {
  const state = calculateSlaState(
    {
      status: 'In Progress',
      date_submitted: '2026-08-25T08:00:00Z',
      first_response_at: '2026-08-25T09:00:00Z',
      sla_response_due_at: '2026-08-25T12:00:00Z',
      sla_resolution_due_at: '2026-08-26T08:00:00Z',
    },
    new Date('2026-08-25T11:30:00Z'),
    { warningPercent: 75 }
  );

  assert.equal(state.responseWarning, false);
});

test('calculateSlaState reports the highest reached SLA warning stage', () => {
  const state = calculateSlaState(
    {
      status: 'Assigned',
      date_submitted: '2026-08-25T08:00:00Z',
      sla_response_due_at: '2026-08-25T12:00:00Z',
      sla_resolution_due_at: '2026-08-25T16:00:00Z',
    },
    new Date('2026-08-25T11:40:00Z'),
    { warningThresholds: [50, 75, 90] }
  );

  assert.equal(state.responseWarningLevel, 90);
  assert.equal(state.resolutionWarningLevel, 0);
  assert.equal(state.warning, true);
});

test('isOpenTicketStatus returns false for closed or cancelled tickets', () => {
  assert.equal(isOpenTicketStatus('Assigned'), true);
  assert.equal(isOpenTicketStatus('Closed'), false);
  assert.equal(isOpenTicketStatus('Cancelled'), false);
});
