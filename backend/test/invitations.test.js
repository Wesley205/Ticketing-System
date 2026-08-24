const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  validateInvitationRequest,
} = require('../src/utils/invitations');

test('invitation tokens are generated and hashed deterministically', () => {
  const token = createInvitationToken();
  assert.ok(token.length >= 16);
  assert.equal(hashInvitationToken('abc123'), hashInvitationToken('abc123'));
  assert.notEqual(hashInvitationToken('abc123'), hashInvitationToken('abc124'));
});

test('invitation url uses configured base url', () => {
  process.env.INTERNAL_APP_BASE_URL = 'https://service-desk.internal';
  const url = buildInvitationUrl('sample-token');
  assert.equal(url, 'https://service-desk.internal/register.html?token=sample-token');
});

test('temporary invitations require sponsor and expiration', () => {
  const error = validateInvitationRequest({
    email: 'user@example.com',
    user_type: 'contractor',
    sponsor_name: '',
    account_expiration_date: '',
  });
  assert.equal(error, 'Temporary-user invitations require a sponsor or supervisor.');
});
