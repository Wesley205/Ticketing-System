const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isTextCandidate,
  scanTextForSecrets,
  shouldSkipPath,
} = require('../src/scripts/secretScan');
const {
  getBaseUrl,
  runSmokeCheck,
} = require('../src/scripts/smokeCheck');

const repoRoot = path.join(__dirname, '..', '..');

test('backend package exposes CI and release scripts', () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'),
  );

  assert.equal(packageJson.scripts.ci, 'npm test && npm run secret-scan');
  assert.equal(packageJson.scripts['secret-scan'], 'node src/scripts/secretScan.js');
  assert.equal(packageJson.scripts.smoke, 'node src/scripts/smokeCheck.js');
  assert.match(packageJson.scripts['release:check'], /npm audit --audit-level=high/);
});

test('GitHub workflow includes required backend release gates', () => {
  const workflow = fs.readFileSync(
    path.join(repoRoot, '.github', 'workflows', 'backend-ci.yml'),
    'utf8',
  );

  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run secret-scan/);
  assert.match(workflow, /npm audit --audit-level=high --omit=dev/);
  assert.match(workflow, /npm pack --dry-run/);
});

test('secret scanner reports key names without requiring secret values in output', () => {
  const findings = scanTextForSecrets([
    ['JWT_SECRET', 'super_real_secret_value_123456'].join('='),
    ['SMTP_PASS', 'replace_with_smtp_password'].join('='),
  ].join('\n'));

  assert.deepEqual(findings, [{ key: 'JWT_SECRET' }]);
});

test('secret scanner skips generated and runtime-only directories', () => {
  assert.equal(shouldSkipPath(path.join(repoRoot, 'backend', 'node_modules', 'pg', 'index.js'), repoRoot), true);
  assert.equal(shouldSkipPath(path.join(repoRoot, 'storage', 'ticket-attachments', '1', 'file.txt'), repoRoot), true);
  assert.equal(shouldSkipPath(path.join(repoRoot, 'backend', 'src', 'app.js'), repoRoot), false);
});

test('secret scanner ignores ordinary code variables and binary document types', () => {
  assert.deepEqual(scanTextForSecrets('const token = buildInvitationToken();'), []);
  assert.deepEqual(scanTextForSecrets('password_hash TEXT NOT NULL'), []);
  assert.equal(isTextCandidate(path.join(repoRoot, 'docs', 'report.pptx')), false);
  assert.equal(isTextCandidate(path.join(repoRoot, 'backend', '.env.example')), true);
});

test('getBaseUrl prefers smoke target and strips trailing slash', () => {
  const previousSmoke = process.env.SMOKE_BASE_URL;
  const previousInternal = process.env.INTERNAL_APP_BASE_URL;
  process.env.SMOKE_BASE_URL = 'http://localhost:5000/';
  process.env.INTERNAL_APP_BASE_URL = 'http://localhost:6000/';

  try {
    assert.equal(getBaseUrl(), 'http://localhost:5000');
  } finally {
    if (previousSmoke === undefined) delete process.env.SMOKE_BASE_URL;
    else process.env.SMOKE_BASE_URL = previousSmoke;

    if (previousInternal === undefined) delete process.env.INTERNAL_APP_BASE_URL;
    else process.env.INTERNAL_APP_BASE_URL = previousInternal;
  }
});

test('runSmokeCheck validates health and readiness responses', async () => {
  const urls = [];
  const result = await runSmokeCheck({
    baseUrl: 'http://localhost:5000',
    fetcher: async (url) => {
      urls.push(url);
      if (url.endsWith('/api/health')) {
        return { ok: true, status: 200, payload: { status: 'ok' } };
      }
      return { ok: true, status: 200, payload: { ready: true } };
    },
  });

  assert.equal(result.status, 'ok');
  assert.deepEqual(urls, [
    'http://localhost:5000/api/health',
    'http://localhost:5000/api/health/readiness',
  ]);
});
