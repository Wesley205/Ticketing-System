const test = require('node:test');
const assert = require('node:assert/strict');

const { isDue } = require('../src/utils/operationalJobs');

test('operational jobs run when no successful execution exists', () => {
  assert.equal(isDue(null, 5, Date.now()), true);
});

test('operational jobs respect their minimum interval', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  assert.equal(isDue('2026-10-08T11:57:00Z', 5, now), false);
  assert.equal(isDue('2026-10-08T11:55:00Z', 5, now), true);
});
