const http = require('http');
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/app');
const { shutdownServer } = require('../src/server');

const REACT_ROUTES = [
  '/',
  '/login',
  '/activate',
  '/dashboard',
  '/foundation',
  '/service-requests',
  '/service-requests/12',
  '/technician',
  '/technician/work/ticket/12',
  '/assets',
  '/assets/3',
  '/maintenance',
  '/staff',
  '/departments',
  '/knowledge-base',
  '/reports',
  '/audit-logs',
  '/about',
];

function createTempFrontend() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nsc-react-serving-'));
  const frontendPath = path.join(rootDir, 'frontend');
  const distPath = path.join(frontendPath, 'dist');

  fs.mkdirSync(path.join(distPath, 'assets'), { recursive: true });
  fs.writeFileSync(
    path.join(distPath, 'react-shell.html'),
    '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/shell.js"></script></body></html>'
  );
  fs.writeFileSync(path.join(distPath, 'assets', 'shell.js'), 'window.__NSC_REACT_SHELL__=true;');

  return rootDir;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function requestText(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on('error', reject);
  });
}

async function withServer(callback) {
  const rootDir = createTempFrontend();
  const app = createApp({
    rootDir,
    env: {
      NODE_ENV: 'production',
      JWT_SECRET: 'test-secret',
      ORGANIZATION_EMAIL_DOMAINS: 'nscict.local',
      CORS_ALLOWED_ORIGINS: 'http://127.0.0.1',
      PGPASSWORD: 'test',
      RATE_LIMIT_MAX: '5000',
    },
  });
  const server = await listen(app);
  const { port } = server.address();

  try {
    await callback(`http://127.0.0.1:${port}`);
  } finally {
    await shutdownServer({
      server,
      pool: { end: async () => {} },
      signal: 'TEST',
    });
  }
}

test('production serving returns the React shell for direct navigation and refresh routes', async () => {
  await withServer(async (baseUrl) => {
    for (const route of REACT_ROUTES) {
      const response = await requestText(`${baseUrl}${route}`);
      assert.equal(response.statusCode, 200, route);
      assert.match(response.body, /id="root"/, route);
      assert.match(response.body, /\/assets\/shell\.js/, route);
    }
  });
});

test('production serving preserves api routes and does not fallback api misses to React', async () => {
  await withServer(async (baseUrl) => {
    const health = await requestText(`${baseUrl}/api/health`);
    const missingApi = await requestText(`${baseUrl}/api/not-a-route`);

    assert.equal(health.statusCode, 200);
    assert.match(health.headers['content-type'], /application\/json/);
    assert.match(health.body, /nsc-ict-service-desk-api/);
    assert.equal(missingApi.statusCode, 404);
    assert.match(missingApi.headers['content-type'], /application\/json/);
    assert.doesNotMatch(missingApi.body, /id="root"/);
  });
});

test('production serving preserves React assets and redirects legacy static page URLs', async () => {
  await withServer(async (baseUrl) => {
    const reactAsset = await requestText(`${baseUrl}/assets/shell.js`);
    const legacyDashboard = await requestText(`${baseUrl}/dashboard.html`);
    const legacyActivation = await requestText(`${baseUrl}/register.html?token=abc123`);
    const legacyScript = await requestText(`${baseUrl}/js/api.js`);
    const legacyStylesheet = await requestText(`${baseUrl}/css/style.css`);

    assert.equal(reactAsset.statusCode, 200);
    assert.match(reactAsset.body, /__NSC_REACT_SHELL__/);
    assert.equal(legacyDashboard.statusCode, 308);
    assert.equal(legacyDashboard.headers.location, '/dashboard');
    assert.equal(legacyActivation.statusCode, 308);
    assert.equal(legacyActivation.headers.location, '/activate?token=abc123');
    assert.equal(legacyScript.statusCode, 404);
    assert.equal(legacyStylesheet.statusCode, 404);
  });
});
