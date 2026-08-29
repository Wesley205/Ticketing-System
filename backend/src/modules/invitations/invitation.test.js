const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./invitation.constants');
const mapper = require('./invitation.mapper');
const policy = require('./invitation.policy');
const repository = require('./invitation.repository');
const routes = require('./invitation.routes');
const service = require('./invitation.service');

test('invitation module generates and hashes tokens deterministically', () => {
  const token = service.createInvitationToken();
  assert.ok(token.length >= 16);
  assert.equal(service.hashInvitationToken('abc123'), service.hashInvitationToken('abc123'));
  assert.notEqual(service.hashInvitationToken('abc123'), service.hashInvitationToken('abc124'));
});

test('invitation module builds acceptance URL from configured base URL', () => {
  process.env.INTERNAL_APP_BASE_URL = 'https://service-desk.internal/';
  assert.equal(
    service.buildInvitationUrl('sample-token'),
    'https://service-desk.internal/register.html?token=sample-token'
  );
});

test('invitation validation requires sponsor and expiration for temporary users', () => {
  const error = service.validateInvitationRequest({
    email: 'user@example.com',
    user_type: 'contractor',
    sponsor_name: '',
    account_expiration_date: '',
  });

  assert.equal(error, 'Temporary-user invitations require a sponsor or supervisor.');
});

test('invitation policy distinguishes list, create, and revoke permissions', () => {
  const admin = { user_id: 1, role: 'admin', is_active: true, account_status: 'active' };
  const staff = { user_id: 2, role: 'staff', is_active: true, account_status: 'active' };

  assert.equal(policy.canListInvitations(admin), true);
  assert.equal(policy.canIssueInvitation(admin), true);
  assert.equal(policy.canRevokeInvitation(admin), true);
  assert.equal(policy.canListInvitations(staff), false);
});

test('invitation repository builds parameterized list query', () => {
  const query = repository.buildInvitationListQuery({ status: 'pending' });
  assert.equal(query.where, 'WHERE i.status = $1');
  assert.deepEqual(query.params, ['pending']);
});

test('invitation mapper preserves legacy row and session shapes', () => {
  assert.deepEqual(mapper.mapInvitationRow({ invitation_id: 1 }), { invitation_id: 1 });
  assert.deepEqual(mapper.mapSession({ user_id: 2 }, 'token'), { token: 'token', user: { user_id: 2 } });
});

test('invitation routes preserve endpoint surface', () => {
  const endpoints = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.ok(endpoints.includes('GET /'));
  assert.ok(endpoints.includes('POST /'));
  assert.ok(endpoints.includes('POST /accept'));
  assert.ok(endpoints.includes('POST /:id/revoke'));
});

test('invitation constants reuse canonical domain values', () => {
  assert.ok(constants.USER_ROLES.includes('admin'));
  assert.ok(constants.USER_TYPES.includes('contractor'));
  assert.ok(constants.INVITATION_STATUSES.includes('pending'));
});
