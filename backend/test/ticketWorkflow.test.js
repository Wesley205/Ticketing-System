const test = require('node:test');
const assert = require('node:assert/strict');

const {
  canActorTransitionStatus,
  getAllowedTicketTransitions,
  validateTicketTransition,
} = require('../src/modules/serviceRequests/serviceRequest.workflow');

test('assigned technician can move a ticket through active work states', () => {
  const technician = { user_id: 4, role: 'technician' };
  const request = { requester_id: 10, assigned_technician_id: 4, status: 'Assigned' };

  assert.equal(canActorTransitionStatus(technician, request, 'Accepted'), true);
  assert.equal(canActorTransitionStatus(technician, request, 'In Progress'), true);
  assert.equal(canActorTransitionStatus(technician, request, 'Closed'), false);
});

test('requester can only close resolved tickets or reopen resolved or closed tickets', () => {
  const requester = { user_id: 8, role: 'staff' };

  assert.equal(
    canActorTransitionStatus(requester, { requester_id: 8, assigned_technician_id: 4, status: 'Resolved' }, 'Closed'),
    true
  );
  assert.equal(
    canActorTransitionStatus(requester, { requester_id: 8, assigned_technician_id: 4, status: 'Closed' }, 'Reopened'),
    true
  );
  assert.equal(
    canActorTransitionStatus(requester, { requester_id: 8, assigned_technician_id: 4, status: 'Assigned' }, 'Cancelled'),
    false
  );
});

test('transition validation rejects invalid status jumps', () => {
  const actor = { user_id: 1, role: 'ict_officer' };
  const request = { requester_id: 8, assigned_technician_id: 4, status: 'New' };

  assert.match(validateTicketTransition(request, 'Resolved', actor), /cannot move/i);
  assert.equal(validateTicketTransition(request, 'Assigned', actor), null);
});

test('allowed transitions are filtered by actor permissions', () => {
  const actor = { user_id: 12, role: 'staff' };
  const request = { requester_id: 12, assigned_technician_id: 4, status: 'Resolved' };

  assert.deepEqual(getAllowedTicketTransitions(actor, request), ['Closed', 'Reopened']);
});
