const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getCorsAllowedOrigins,
  getCorsOptions,
  getDatabaseConfig,
  validateRuntimeConfig,
} = require('../src/config/runtime');

test('runtime config rejects missing production hardening values', () => {
  const result = validateRuntimeConfig({
    NODE_ENV: 'production',
    JWT_SECRET: 'short',
    ORGANIZATION_EMAIL_DOMAINS: '',
    PGPASSWORD: '',
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /JWT_SECRET/);
  assert.match(result.errors.join(' '), /ORGANIZATION_EMAIL_DOMAINS/);
  assert.match(result.errors.join(' '), /CORS_ALLOWED_ORIGINS/);
  assert.match(result.errors.join(' '), /PGPASSWORD/);
});

test('runtime config accepts explicit production security settings', () => {
  const result = validateRuntimeConfig({
    NODE_ENV: 'production',
    JWT_SECRET: 'a-very-long-production-secret-value', // pragma: allowlist secret
    ORGANIZATION_EMAIL_DOMAINS: 'nscict.local',
    CORS_ALLOWED_ORIGINS: 'https://service-desk.nscict.local',
    PGDATABASE: 'nsc_ict_system',
    PGUSER: 'nsc_app',
    PGPASSWORD: 'not-a-real-secret', // pragma: allowlist secret
  });

  assert.equal(result.ok, true);
});

test('cors allowed origins include configured app and development localhost', () => {
  const origins = getCorsAllowedOrigins({
    NODE_ENV: 'development',
    PORT: '5050',
    INTERNAL_APP_BASE_URL: 'http://localhost:5050/',
    CORS_ALLOWED_ORIGINS: 'http://example.local',
  });

  assert.deepEqual(origins, [
    'http://example.local',
    'http://localhost:5050',
    'http://127.0.0.1:5050',
  ]);
});

test('cors options reject unknown browser origins but allow same-origin requests', async () => {
  const options = getCorsOptions({
    NODE_ENV: 'production',
    INTERNAL_APP_BASE_URL: 'https://service-desk.nscict.local',
    CORS_ALLOWED_ORIGINS: 'https://service-desk.nscict.local',
  });

  await new Promise((resolve, reject) => {
    options.origin(undefined, (err, allowed) => {
      try {
        assert.equal(err, null);
        assert.equal(allowed, true);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });

  await new Promise((resolve, reject) => {
    options.origin('https://evil.example', (err) => {
      try {
        assert.match(err.message, /not allowed/);
        resolve();
      } catch (assertionError) {
        reject(assertionError);
      }
    });
  });
});

test('database config supports ssl and pool tuning from environment', () => {
  const config = getDatabaseConfig({
    PGHOST: 'db.internal',
    PGPORT: '5433',
    PGDATABASE: 'nsc',
    PGUSER: 'svc',
    PGPASSWORD: 'pw',
    DB_SSL: 'true',
    DB_SSL_REJECT_UNAUTHORIZED: 'false',
    PGPOOL_MAX: '20',
    PGIDLE_TIMEOUT_MS: '5000',
    PGCONNECTION_TIMEOUT_MS: '2500',
  });

  assert.equal(config.host, 'db.internal');
  assert.equal(config.port, 5433);
  assert.equal(config.max, 20);
  assert.equal(config.ssl.rejectUnauthorized, false);
});
