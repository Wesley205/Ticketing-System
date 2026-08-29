const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_FORBIDDEN_MESSAGE,
  createAuthenticationError,
  createAuthorizationError,
  assertAllowed,
  deny,
  requireAnyPermission,
  requirePermission,
} = require('../src/middleware/authorize');

test('requirePermission rejects unauthenticated requests', () => {
  const res = {};
  let nextCalled = false;
  let nextError = null;

  requirePermission(() => true)({}, res, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(nextError.code, 'AUTHENTICATION_REQUIRED');
  assert.equal(nextError.statusCode, 401);
  assert.equal(nextError.message, 'Authentication required.');
});

test('requirePermission rejects failed policy checks with custom message', () => {
  const res = {};
  let nextCalled = false;
  let nextError = null;

  requirePermission(() => false, 'Denied')({ user: { role: 'staff' } }, res, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(nextError.code, 'AUTHORIZATION_FAILED');
  assert.equal(nextError.statusCode, 403);
  assert.equal(nextError.message, 'Denied');
});

test('requirePermission allows successful policy checks', () => {
  const res = {};
  let nextCalled = false;
  let nextError = null;

  requirePermission((user) => user.role === 'admin')({ user: { role: 'admin' } }, res, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextError, undefined);
  assert.equal(nextCalled, true);
});

test('requireAnyPermission allows when any supplied policy passes', () => {
  const res = {};
  let nextCalled = false;
  let nextError = null;

  requireAnyPermission([
    () => false,
    (user) => user.role === 'ict_officer',
  ])({ user: { role: 'ict_officer' } }, res, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextError, undefined);
  assert.equal(nextCalled, true);
});

test('requirePermission accepts centralized permission strings', () => {
  const res = {};
  let nextCalled = false;
  let nextError = null;

  requirePermission('reports.view')({
    user: {
      user_id: 1,
      role: 'admin',
      user_type: 'employee',
      is_active: true,
      account_status: 'active',
    },
  }, res, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextError, undefined);
  assert.equal(nextCalled, true);
});

test('assertAllowed throws a normalized forbidden error', () => {
  assert.throws(
    () => assertAllowed({ role: 'staff' }, () => false),
    (err) => err.status === 403 &&
      err.code === 'AUTHORIZATION_FAILED' &&
      err.message === DEFAULT_FORBIDDEN_MESSAGE
  );
});

test('authorization helpers create normalized AppError instances', () => {
  const authn = createAuthenticationError('Login first');
  const authz = createAuthorizationError('Denied');

  assert.equal(authn.code, 'AUTHENTICATION_REQUIRED');
  assert.equal(authn.statusCode, 401);
  assert.equal(authn.message, 'Login first');
  assert.equal(authz.code, 'AUTHORIZATION_FAILED');
  assert.equal(authz.statusCode, 403);
  assert.equal(authz.message, 'Denied');
  assert.throws(() => deny({}, 'Denied'), (err) => err.code === 'AUTHORIZATION_FAILED');
});
