const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getLoginProtectionConfig,
  isAccountLocked,
  recordFailedLogin,
  resetLoginProtection,
  validatePasswordStrength,
} = require('../src/utils/authSecurity');

test('login protection config uses safe defaults and explicit overrides', () => {
  assert.deepEqual(getLoginProtectionConfig({}), {
    maxFailedAttempts: 5,
    lockoutMinutes: 15,
  });
  assert.deepEqual(getLoginProtectionConfig({
    LOGIN_MAX_FAILED_ATTEMPTS: '3',
    LOGIN_LOCKOUT_MINUTES: '20',
  }), {
    maxFailedAttempts: 3,
    lockoutMinutes: 20,
  });
});

test('isAccountLocked detects active lockout windows', () => {
  const now = new Date('2026-08-28T12:00:00Z');
  assert.equal(isAccountLocked({ locked_until: '2026-08-28T12:05:00Z' }, now), true);
  assert.equal(isAccountLocked({ locked_until: '2026-08-28T11:55:00Z' }, now), false);
  assert.equal(isAccountLocked({}, now), false);
});

test('recordFailedLogin increments attempts and applies configured threshold', async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ failed_login_attempts: 3, locked_until: '2026-08-28T12:15:00Z' }] };
    },
  };

  const result = await recordFailedLogin(pool, 10, { maxFailedAttempts: 3, lockoutMinutes: 15 });

  assert.equal(result.failed_login_attempts, 3);
  assert.equal(calls[0].params[0], 10);
  assert.equal(calls[0].params[1], 3);
  assert.equal(calls[0].params[2], 15);
});

test('resetLoginProtection clears failures and updates last login timestamp', async () => {
  const calls = [];
  const pool = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await resetLoginProtection(pool, 12);

  assert.match(calls[0].sql, /failed_login_attempts = 0/i);
  assert.match(calls[0].sql, /locked_until = NULL/i);
  assert.match(calls[0].sql, /last_login_at = NOW\(\)/i);
  assert.deepEqual(calls[0].params, [12]);
});

test('validatePasswordStrength requires length and mixed character classes', () => {
  assert.match(validatePasswordStrength('short1A!'), /at least 12/);
  assert.match(validatePasswordStrength('password123!'), /uppercase/);
  assert.match(validatePasswordStrength('Password12345'), /symbol/);
  assert.equal(validatePasswordStrength('Password123!'), null);
});
