const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ONE_HOUR_SECONDS,
  buildContentSecurityPolicy,
  getStaticOptions,
  securityHeaders,
} = require('../src/middleware/securityHeaders');

function createResponse() {
  const headers = {};
  return {
    headers,
    setHeader(name, value) {
      headers[name] = value;
    },
  };
}

test('securityHeaders sets browser hardening headers', () => {
  const res = createResponse();
  let nextCalled = false;

  securityHeaders({}, res, () => {
    nextCalled = true;
  });

  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['X-Frame-Options'], 'DENY');
  assert.equal(res.headers['Referrer-Policy'], 'same-origin');
  assert.match(res.headers['Permissions-Policy'], /camera=\(\)/);
  assert.match(res.headers['Content-Security-Policy'], /object-src 'none'/);
  assert.equal(nextCalled, true);
});

test('content security policy allows current React frontend requirements', () => {
  const policy = buildContentSecurityPolicy();

  assert.match(policy, /default-src 'self'/);
  assert.match(policy, /script-src 'self' 'unsafe-inline' https:\/\/cdnjs\.cloudflare\.com/);
  assert.match(policy, /style-src 'self' 'unsafe-inline' https:\/\/fonts\.googleapis\.com/);
  assert.match(policy, /font-src 'self' https:\/\/fonts\.gstatic\.com/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /form-action 'self'/);
});

test('static options prevent html caching and cache assets in production', () => {
  const options = getStaticOptions({ NODE_ENV: 'production' });
  const htmlRes = createResponse();
  const assetRes = createResponse();

  options.setHeaders(htmlRes, 'C:/app/frontend/dist/react-shell.html');
  options.setHeaders(assetRes, 'C:/app/frontend/dist/assets/app.js');

  assert.equal(options.etag, true);
  assert.equal(options.maxAge, `${ONE_HOUR_SECONDS}s`);
  assert.equal(htmlRes.headers['Cache-Control'], 'no-store');
  assert.equal(assetRes.headers['Cache-Control'], `public, max-age=${ONE_HOUR_SECONDS}`);
});

test('static options disable long cache in development', () => {
  const options = getStaticOptions({ NODE_ENV: 'development' });
  const res = createResponse();

  options.setHeaders(res, 'C:/app/frontend/dist/assets/app.js');

  assert.equal(options.maxAge, 0);
  assert.equal(res.headers['Cache-Control'], undefined);
});
