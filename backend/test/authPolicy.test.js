const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getOrganizationEmailDomains,
  isOrganizationEmail,
  isTemporaryUser,
  validateManagedUser,
} = require('../src/config/authPolicy');

test('organization email domains are parsed from environment', () => {
  process.env.ORGANIZATION_EMAIL_DOMAINS = 'nscict.local, example.org';
  assert.deepEqual(getOrganizationEmailDomains(), ['nscict.local', 'example.org']);
});

test('employee accounts require an approved organization email', () => {
  process.env.ORGANIZATION_EMAIL_DOMAINS = 'nscict.local';
  assert.equal(isOrganizationEmail('user@nscict.local'), true);
  assert.match(
    validateManagedUser({
      email: 'user@gmail.com',
      role: 'staff',
      user_type: 'employee',
    }),
    /approved organization email domain/i
  );
});

test('temporary users require sponsor and expiration date', () => {
  assert.equal(isTemporaryUser('intern'), true);
  assert.equal(
    validateManagedUser({
      email: 'temp@example.com',
      role: 'staff',
      user_type: 'intern',
      sponsor_name: '',
      account_expiration_date: null,
    }),
    'Temporary users require a sponsor or supervisor.'
  );
});
