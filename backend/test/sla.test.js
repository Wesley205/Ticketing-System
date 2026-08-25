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

test('isOpenTicketStatus returns false for closed or cancelled tickets', () => {
  assert.equal(isOpenTicketStatus('Assigned'), true);
  assert.equal(isOpenTicketStatus('Closed'), false);
  assert.equal(isOpenTicketStatus('Cancelled'), false);
});
