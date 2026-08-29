const EventEmitter = require('node:events');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REQUEST_ID_HEADER,
  generateRequestId,
  requestContext,
  sanitizeRequestId,
} = require('../src/middleware/requestContext');

test('sanitizeRequestId accepts safe incoming request IDs only', () => {
  assert.equal(sanitizeRequestId('req-12345678'), 'req-12345678');
  assert.equal(sanitizeRequestId(['abcDEF12']), 'abcDEF12');
  assert.equal(sanitizeRequestId('short'), null);
  assert.equal(sanitizeRequestId('bad header value'), null);
  assert.equal(sanitizeRequestId('../bad-request-id'), null);
});

test('generateRequestId returns a usable request ID', () => {
  const requestId = generateRequestId();

  assert.equal(typeof requestId, 'string');
  assert.ok(requestId.length >= 8);
});

test('requestContext sets response header and request field', () => {
  const req = {
    headers: { 'x-request-id': 'req-12345678' },
    method: 'GET',
    originalUrl: '/api/health',
    user: null,
  };
  const res = new EventEmitter();
  const headers = {};
  res.statusCode = 200;
  res.setHeader = (name, value) => {
    headers[name] = value;
  };

  let nextCalled = false;
  requestContext(req, res, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.requestId, 'req-12345678');
  assert.equal(headers[REQUEST_ID_HEADER], 'req-12345678');
});
