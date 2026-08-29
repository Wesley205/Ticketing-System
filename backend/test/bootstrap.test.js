const http = require('http');
const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');
const { loadConfig, validateRuntimeConfig } = require('../src/config');
const {
  shutdownServer,
  startServer,
} = require('../src/server');

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      resolve(server);
    });
  });
}

function getJson(url) {
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
          body: JSON.parse(body),
        });
      });
    });

    req.on('error', reject);
  });
}

test('application factory can be imported without opening a port', () => {
  const app = createApp({
    config: {
      jsonBodyLimit: '1mb',
    },
    env: {
      NODE_ENV: 'test',
      PORT: '5000',
      INTERNAL_APP_BASE_URL: 'http://localhost:5000',
    },
  });

  assert.equal(typeof app.listen, 'function');
});

test('health endpoint responds from imported app factory', async () => {
  const app = createApp({
    config: {
      jsonBodyLimit: '1mb',
    },
    env: {
      NODE_ENV: 'test',
      PORT: '5000',
      INTERNAL_APP_BASE_URL: 'http://localhost:5000',
    },
  });
  const server = await listen(app);
  const { port } = server.address();

  try {
    const response = await getJson(`http://127.0.0.1:${port}/api/health`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.service, 'nsc-ict-service-desk-api');
    assert.equal(typeof response.headers['x-request-id'], 'string');
  } finally {
    await shutdownServer({
      server,
      pool: { end: async () => {} },
      signal: 'TEST',
    });
  }
});

test('production config fails clearly when required variables are missing', () => {
  const result = validateRuntimeConfig({
    NODE_ENV: 'production',
    JWT_SECRET: 'short',
    ORGANIZATION_EMAIL_DOMAINS: '',
    CORS_ALLOWED_ORIGINS: '',
    PGPASSWORD: '',
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /JWT_SECRET/);
  assert.match(result.errors.join(' '), /ORGANIZATION_EMAIL_DOMAINS/);
  assert.match(result.errors.join(' '), /CORS_ALLOWED_ORIGINS/);
  assert.match(result.errors.join(' '), /PGPASSWORD/);
});

test('test environment config can load with explicit safe test values', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret',
    ORGANIZATION_EMAIL_DOMAINS: 'nscict.local',
  });

  assert.equal(config.nodeEnv, 'test');
  assert.equal(config.port, 5000);
});

test('startServer supports controlled startup without background jobs or signal handlers', () => {
  let listenedPort = null;
  const fakeServer = {
    close(callback) {
      callback();
    },
  };
  const fakeApp = {
    listen(port, callback) {
      listenedPort = port;
      callback();
      return fakeServer;
    },
  };
  const fakePool = {
    end: async () => {},
  };

  const runtime = startServer({
    app: fakeApp,
    pool: fakePool,
    config: {
      nodeEnv: 'test',
      port: 5055,
    },
    startJobs: false,
    registerSignals: false,
  });

  assert.equal(listenedPort, 5055);
  assert.equal(runtime.server, fakeServer);
  assert.equal(runtime.pool, fakePool);
});

test('shutdownServer closes HTTP server and database pool', async () => {
  const calls = [];
  const fakeServer = {
    close(callback) {
      calls.push('server.close');
      callback();
    },
  };
  const fakePool = {
    async end() {
      calls.push('pool.end');
    },
  };

  await shutdownServer({
    server: fakeServer,
    pool: fakePool,
    signal: 'TEST',
  });

  assert.deepEqual(calls, ['server.close', 'pool.end']);
});
