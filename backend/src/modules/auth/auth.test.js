const test = require("node:test");
const assert = require("node:assert/strict");

const constants = require("./auth.constants");
const mapper = require("./auth.mapper");
const policy = require("./auth.policy");
const repository = require("./auth.repository");
const routes = require("./auth.routes");
const service = require("./auth.service");

test("auth module exposes production-safe constants", () => {
  assert.equal(constants.GENERIC_INVALID_CREDENTIALS, "Invalid credentials.");
  assert.equal(constants.DEFAULT_JWT_EXPIRES_IN, "8h");
  assert.match(constants.USER_SELECT_COLUMNS, /password_hash/);
});

test("auth mapper strips sensitive credential fields", () => {
  const mapped = mapper.sanitizeUser({
    user_id: 1,
    email: "user@nscict.local",
    password_hash: "hash",
    token_hash: "token",
    reset_token_hash: "reset",
  });

  assert.equal(mapped.password_hash, undefined);
  assert.equal(mapped.token_hash, undefined);
  assert.equal(mapped.reset_token_hash, undefined);
  assert.equal(mapped.email, "user@nscict.local");
});

test("auth policy keeps account status decisions centralized", () => {
  assert.equal(policy.checkAccountStatus({
    user_id: 1,
    is_active: true,
    account_status: "active",
    account_start_date: "2026-01-01",
  }, "2026-08-28").valid, true);
  assert.equal(policy.checkAccountStatus({
    user_id: 1,
    is_active: true,
    account_status: "active",
    account_start_date: "2026-09-01",
  }, "2026-08-28").reason, "not_started");
});

test("auth repository owns user and reset-token SQL", async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await repository.findUserForAuthentication(executor, "user@nscict.local");
  await repository.findUserForSession(executor, 3);
  await repository.incrementSessionVersion(executor, 3);

  assert.match(calls[0].sql, /FROM users/i);
  assert.match(calls[0].sql, /LOWER\(email\)/i);
  assert.match(calls[1].sql, /WHERE user_id = \$1/i);
  assert.match(calls[2].sql, /session_version = session_version \+ 1/i);
});

test("auth service preserves token and normalization helpers", () => {
  assert.equal(service.normalizeEmail(" USER@NSCICT.LOCAL "), "user@nscict.local");
  assert.equal(service.normalizeIdentifier(" Ada.Admin "), "ada.admin");
  assert.equal(service.isValidJwtExpiration("15m"), true);
  assert.equal(service.isValidJwtExpiration("forever"), false);
});

test("auth routes expose the compatibility router", () => {
  assert.equal(typeof routes, "function");
  assert.ok(routes.stack.length >= 6);
});
