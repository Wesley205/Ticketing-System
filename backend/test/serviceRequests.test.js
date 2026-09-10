const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTicketNumber } = require('../src/modules/serviceRequests/serviceRequest.workflow');

test('buildTicketNumber formats the NSC ticket number with the request year and zero padding', () => {
  const ticketNumber = buildTicketNumber(42, new Date('2026-08-24T10:00:00Z'));
  assert.equal(ticketNumber, 'NSC-2026-00042');
});
