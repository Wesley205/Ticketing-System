const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const {
  buildLegacyRedirectTarget,
  configureFrontendServing,
  getFrontendShellPath,
  resolveFrontendPaths,
  shouldServeFrontendFallback,
} = require('../src/middleware/frontendServing');

function createTempFrontend() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nsc-frontend-serving-'));
  const frontendPath = path.join(rootDir, 'frontend');
  const distPath = path.join(frontendPath, 'dist');

  fs.mkdirSync(path.join(distPath, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(distPath, 'react-shell.html'), '<html><body><div id="root"></div><script src="/assets/app.js"></script></body></html>');
  fs.writeFileSync(path.join(distPath, 'assets', 'app.js'), 'console.log("react")');

  return rootDir;
}

function createMockResponse() {
  return {
    sentFile: null,
    sendFile(filePath) {
      this.sentFile = filePath;
    },
  };
}

test('frontend path resolver prefers built React shell when available', () => {
  const rootDir = createTempFrontend();
  const paths = resolveFrontendPaths(rootDir);

  assert.equal(getFrontendShellPath(paths), path.join(rootDir, 'frontend', 'dist', 'react-shell.html'));
});

test('frontend path resolver does not fall back to archived static pages when React build is unavailable', () => {
  const rootDir = createTempFrontend();
  fs.rmSync(path.join(rootDir, 'frontend', 'dist', 'react-shell.html'));
  const paths = resolveFrontendPaths(rootDir);

  assert.equal(getFrontendShellPath(paths), null);
});

test('frontend fallback excludes api routes, non-get methods, and asset paths', () => {
  assert.equal(shouldServeFrontendFallback({ method: 'GET', path: '/dashboard' }), true);
  assert.equal(shouldServeFrontendFallback({ method: 'GET', path: '/service-requests/12' }), true);
  assert.equal(shouldServeFrontendFallback({ method: 'GET', path: '/api/health' }), false);
  assert.equal(shouldServeFrontendFallback({ method: 'POST', path: '/dashboard' }), false);
  assert.equal(shouldServeFrontendFallback({ method: 'GET', path: '/css/style.css' }), false);
});

test('frontend fallback sends React shell for direct React deep links', () => {
  const rootDir = createTempFrontend();
  const app = express();
  configureFrontendServing(app, { rootDir, env: { NODE_ENV: 'production' } });
  const fallbackLayer = app._router.stack.find((layer) => layer.route?.path === '*');
  const req = { method: 'GET', path: '/service-requests/12' };
  const res = createMockResponse();

  fallbackLayer.route.stack[0].handle(req, res, () => {});

  assert.equal(res.sentFile, path.join(rootDir, 'frontend', 'dist', 'react-shell.html'));
});

test('legacy static page URLs redirect to equivalent React routes', () => {
  assert.equal(
    buildLegacyRedirectTarget({ path: '/register.html', originalUrl: '/register.html?token=sample' }),
    '/activate?token=sample'
  );
  assert.equal(
    buildLegacyRedirectTarget({ path: '/dashboard.html', originalUrl: '/dashboard.html' }),
    '/dashboard'
  );
  assert.equal(buildLegacyRedirectTarget({ path: '/unknown.html', originalUrl: '/unknown.html' }), null);
});
