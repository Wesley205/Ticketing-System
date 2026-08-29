const test = require('node:test');
const assert = require('node:assert/strict');

const { buildLogEntry, redactSensitive } = require('../src/utils/logger');

test('redactSensitive removes secret-like fields recursively', () => {
  const redacted = redactSensitive({
    email: 'admin@nscict.local',
    password: 'plain-text',
    nested: {
      accessToken: 'jwt',
      authorization: 'Bearer token',
      safe: 'value',
    },
    items: [{ api_key: 'provider-key' }],
  });

  assert.equal(redacted.email, 'admin@nscict.local');
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.nested.accessToken, '[REDACTED]');
  assert.equal(redacted.nested.authorization, '[REDACTED]');
  assert.equal(redacted.nested.safe, 'value');
  assert.equal(redacted.items[0].api_key, '[REDACTED]');
});

test('buildLogEntry returns structured JSON-safe log metadata', () => {
  const entry = buildLogEntry('error', 'login_failed', {
    request_id: 'req-12345678',
    error: new Error('failed'),
    refresh_token: 'secret',
  });

  assert.equal(entry.level, 'error');
  assert.equal(entry.event, 'login_failed');
  assert.equal(entry.request_id, 'req-12345678');
  assert.equal(entry.error.message, 'failed');
  assert.equal(entry.refresh_token, '[REDACTED]');
  assert.match(entry.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});
