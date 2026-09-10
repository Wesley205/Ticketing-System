const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  checkAccountStatus,
  createPasswordResetToken,
  getJwtConfig,
  hashOpaqueToken,
  invalidCredentialError,
  isValidJwtExpiration,
  issueToken,
  loginUser,
  normalizeEmail,
  normalizeIdentifier,
  resetPasswordWithToken,
  sanitizeUser,
  verifyToken,
} = require('../src/modules/auth/auth.service');

const jwtSecretKey = ['JWT', 'SECRET'].join('_');

function createMockExecutor({ users = [], resetTokens = [] } = {}) {
  const calls = [];

  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql, params });

      if (/FROM users\s+WHERE LOWER\(email\) = \$1 OR LOWER\(username\) = \$1/i.test(sql)) {
        const identifier = params[0];
        const user = users.find((row) => row.email.toLowerCase() === identifier || row.username.toLowerCase() === identifier);
        return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
      }

      if (/FROM users\s+WHERE LOWER\(email\) = \$1/i.test(sql)) {
        const email = params[0];
        const user = users.find((row) => row.email.toLowerCase() === email);
        return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
      }

      if (/FROM password_reset_tokens/i.test(sql)) {
        const tokenHash = params[0];
        const resetToken = resetTokens.find((row) => row.token_hash === tokenHash && !row.used_at);
        return { rows: resetToken ? [{ ...resetToken }] : [], rowCount: resetToken ? 1 : 0 };
      }

      return { rows: [], rowCount: 1 };
    },
  };
}

async function createUser(overrides = {}) {
  return {
    user_id: 10,
    full_name: 'Ada Admin',
    email: 'ada.admin@nscict.local',
    username: 'ada.admin',
    password_hash: await bcrypt.hash('CorrectPassword123!', 4),
    role: 'admin',
    user_type: 'employee',
    department_id: 1,
    phone: null,
    is_active: true,
    account_status: 'active',
    account_start_date: '2026-01-01',
    account_expiration_date: null,
    session_version: 3,
    ...overrides,
  };
}

test('JWT config validates secret and token expiration format', () => {
  assert.equal(isValidJwtExpiration('8h'), true);
  assert.equal(isValidJwtExpiration('30m'), true);
  assert.equal(isValidJwtExpiration('0h'), false);
  assert.equal(isValidJwtExpiration('forever'), false);
  assert.equal(getJwtConfig({ JWT_SECRET: 'test-secret-value', JWT_EXPIRES_IN: '15m' }).expiresIn, '15m'); // pragma: allowlist secret
  assert.throws(() => getJwtConfig({ JWT_SECRET: 'test-secret-value', JWT_EXPIRES_IN: 'forever' }), (err) => // pragma: allowlist secret
    err.code === 'INTERNAL_SERVER_ERROR'
  );
});

test('JWT issue and verify preserve role and user_type distinctions', async () => {
  const user = await createUser({ role: 'technician', user_type: 'contractor' });
  const env = { JWT_SECRET: 'test-secret-value', JWT_EXPIRES_IN: '1h' }; // pragma: allowlist secret
  const token = issueToken(user, env);
  const payload = verifyToken(token, env);

  assert.equal(payload.user_id, user.user_id);
  assert.equal(payload.role, 'technician');
  assert.equal(payload.user_type, 'contractor');
  assert.equal(payload.session_version, 3);
});

test('JWT verification rejects expired and tampered tokens', () => {
  const env = { [jwtSecretKey]: 'test-secret-value', JWT_EXPIRES_IN: '1h' };
  const expiredToken = jwt.sign(
    { user_id: 10, session_version: 1, exp: Math.floor(Date.now() / 1000) - 60 },
    env[jwtSecretKey],
  );
  const validToken = jwt.sign({ user_id: 10, session_version: 1 }, env[jwtSecretKey]);
  const tamperedToken = `${validToken.slice(0, -1)}x`;

  assert.throws(() => verifyToken(expiredToken, env), /jwt expired/i);
  assert.throws(() => verifyToken(tamperedToken, env), /invalid signature/i);
});

test('normalizers and sanitizer do not expose password hashes', async () => {
  const user = await createUser();
  const safe = sanitizeUser(user);

  assert.equal(normalizeEmail(' USER@NSCICT.LOCAL '), 'user@nscict.local');
  assert.equal(normalizeIdentifier(' Ada.Admin '), 'ada.admin');
  assert.equal(safe.password_hash, undefined);
  assert.equal(safe.email, user.email);
});

test('account status checks reject suspended, deactivated, future, and expired accounts', async () => {
  assert.equal(checkAccountStatus(await createUser()).valid, true);
  assert.equal(checkAccountStatus(await createUser({ account_status: 'suspended' })).reason, 'suspended');
  assert.equal(checkAccountStatus(await createUser({ is_active: false, account_status: 'deactivated' })).reason, 'deactivated');
  assert.equal(checkAccountStatus(await createUser({ account_start_date: '2026-09-01' }), '2026-08-28').reason, 'not_started');
  assert.equal(checkAccountStatus(await createUser({ account_expiration_date: '2026-08-01' }), '2026-08-28').reason, 'expired');
});

test('invalid login uses generic authentication errors and no password hash response', async () => {
  const executor = createMockExecutor({ users: [await createUser()] });

  await assert.rejects(
    () => loginUser(executor, { identifier: 'ada.admin', password: 'WrongPassword123!' }),
    (err) => err.code === 'INVALID_CREDENTIALS' && err.message === 'Invalid credentials.'
  );

  await assert.rejects(
    () => loginUser(createMockExecutor(), { identifier: 'missing', password: 'WrongPassword123!' }),
    (err) => err.code === 'INVALID_CREDENTIALS' && err.message === 'Invalid credentials.'
  );
});

test('valid login returns token and sanitized user profile', async () => {
  const user = await createUser();
  const executor = createMockExecutor({ users: [user] });
  const originalSecret = process.env[jwtSecretKey];
  const originalExpiry = process.env.JWT_EXPIRES_IN;
  process.env[jwtSecretKey] = 'test-secret-value';
  process.env.JWT_EXPIRES_IN = '1h';

  try {
    const session = await loginUser(executor, {
      identifier: 'ADA.ADMIN@NSCICT.LOCAL',
      password: 'CorrectPassword123!',
    });

    assert.equal(typeof session.token, 'string');
    assert.equal(session.user.password_hash, undefined);
    assert.equal(session.user.role, 'admin');
    assert.equal(session.user.user_type, 'employee');
    assert.equal(session.user.access_profile.role, 'admin');
  } finally {
    if (originalSecret === undefined) delete process.env[jwtSecretKey];
    else process.env[jwtSecretKey] = originalSecret;
    if (originalExpiry === undefined) delete process.env.JWT_EXPIRES_IN;
    else process.env.JWT_EXPIRES_IN = originalExpiry;
  }
});

test('password reset tokens are hashed and completed as single-use credentials', async () => {
  const user = await createUser();
  const executor = createMockExecutor({ users: [user] });
  const reset = await createPasswordResetToken(executor, user.email, { tokenBytes: 8, expiresInMinutes: 15 });

  assert.equal(reset.created, true);
  assert.equal(reset.token_hash, hashOpaqueToken(reset.token));
  assert.equal(executor.calls.some((call) => /INSERT INTO password_reset_tokens/i.test(call.sql)), true);

  const resetExecutor = createMockExecutor({
    resetTokens: [{
      password_reset_token_id: 1,
      user_id: user.user_id,
      full_name: user.full_name,
      token_hash: reset.token_hash,
      used_at: null,
    }],
  });

  const result = await resetPasswordWithToken(resetExecutor, {
    token: reset.token,
    password: 'NewPassword123!',
  });

  assert.equal(result.user_id, user.user_id);
  assert.equal(resetExecutor.calls.some((call) => /SET used_at = NOW\(\)/i.test(call.sql)), true);
  assert.equal(resetExecutor.calls.some((call) => /session_version = session_version \+ 1/i.test(call.sql)), true);
});

test('password reset request remains generic for missing or inactive users', async () => {
  const missing = await createPasswordResetToken(createMockExecutor(), 'missing@nscict.local');
  const inactive = await createPasswordResetToken(
    createMockExecutor({ users: [await createUser({ is_active: false, account_status: 'deactivated' })] }),
    'ada.admin@nscict.local',
  );

  assert.deepEqual(missing, { created: false, token: null, token_hash: null });
  assert.deepEqual(inactive, { created: false, token: null, token_hash: null });
});

test('invalidCredentialError always uses a generic response', () => {
  const err = invalidCredentialError();

  assert.equal(err.code, 'INVALID_CREDENTIALS');
  assert.equal(err.statusCode, 401);
  assert.equal(err.message, 'Invalid credentials.');
});
