const http = require('http');
const express = require('express');
const test = require('node:test');
const assert = require('node:assert/strict');

const AppError = require('../src/errors/AppError');
const { ERROR_CODES } = require('../src/errors/errorCodes');
const { errorHandler, mapKnownError, shouldExposeStack } = require('../src/middleware/errorHandler');
const notFound = require('../src/middleware/notFound');
const { requestId } = require('../src/middleware/requestId');
const asyncHandler = require('../src/utils/asyncHandler');
const { sendSuccess } = require('../src/utils/response');

function buildErrorTestApp() {
  const app = express();

  app.use(requestId);
  app.use(express.json({ limit: '1kb' }));

  app.get('/ok', (req, res) => {
    sendSuccess(res, { ok: true }, { req });
  });

  app.get('/route-error', (req, _res, next) => {
    next(new AppError({
      code: ERROR_CODES.BAD_REQUEST,
      statusCode: 400,
      message: 'Route failed validation.',
      details: [{ field: 'name', message: 'Name is required.' }],
    }));
  });

  app.get('/validation-error', (_req, _res, next) => {
    next({
      errors: [
        { path: 'email', msg: 'Email is invalid.' },
      ],
    });
  });

  app.get('/db-duplicate', (_req, _res, next) => {
    const err = new Error('duplicate key value violates unique constraint');
    err.code = '23505';
    next(err);
  });

  app.get('/db-foreign-key', (_req, _res, next) => {
    const err = new Error('insert or update violates foreign key constraint');
    err.code = '23503';
    next(err);
  });

  app.get('/unexpected', asyncHandler(async () => {
    throw new Error('Unexpected internal failure.');
  }));

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function request(server, path, headers = {}) {
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let data = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
          });
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

async function withEnv(env, callback) {
  const original = {};

  Object.keys(env).forEach((key) => {
    original[key] = process.env[key];
    process.env[key] = env[key];
  });

  try {
    return await callback();
  } finally {
    Object.keys(env).forEach((key) => {
      if (original[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original[key];
      }
    });
  }
}

test('sendSuccess emits the standard success response envelope', async () => {
  const server = await listen(buildErrorTestApp());

  try {
    const response = await request(server, '/ok', { 'X-Request-ID': 'req-success-123' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, {
      success: true,
      data: { ok: true },
      meta: { request_id: 'req-success-123' },
    });
  } finally {
    await closeServer(server);
  }
});

test('route AppError emits the standard error response envelope', async () => {
  const server = await listen(buildErrorTestApp());

  try {
    const response = await request(server, '/route-error', { 'X-Request-ID': 'req-error-123' });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, ERROR_CODES.BAD_REQUEST);
    assert.equal(response.body.error.message, 'Route failed validation.');
    assert.deepEqual(response.body.error.details, [{ field: 'name', message: 'Name is required.' }]);
    assert.equal(response.body.meta.request_id, 'req-error-123');
  } finally {
    await closeServer(server);
  }
});

test('validation errors are normalized', async () => {
  const server = await listen(buildErrorTestApp());

  try {
    const response = await request(server, '/validation-error');

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error.code, ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [{ field: 'email', message: 'Email is invalid.' }]);
  } finally {
    await closeServer(server);
  }
});

test('database duplicate and foreign-key errors are mapped safely', async () => {
  const server = await listen(buildErrorTestApp());

  try {
    const duplicate = await request(server, '/db-duplicate');
    const foreignKey = await request(server, '/db-foreign-key');

    assert.equal(duplicate.statusCode, 409);
    assert.equal(duplicate.body.error.code, ERROR_CODES.DUPLICATE_RESOURCE);
    assert.equal(duplicate.body.error.details.length, 0);
    assert.equal(foreignKey.statusCode, 409);
    assert.equal(foreignKey.body.error.code, ERROR_CODES.FOREIGN_KEY_VIOLATION);
    assert.equal(foreignKey.body.error.details.length, 0);
  } finally {
    await closeServer(server);
  }
});

test('unknown routes are mapped to RESOURCE_NOT_FOUND', async () => {
  const server = await listen(buildErrorTestApp());

  try {
    const response = await request(server, '/missing');

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.error.code, ERROR_CODES.RESOURCE_NOT_FOUND);
    assert.equal(response.body.success, false);
  } finally {
    await closeServer(server);
  }
});

test('unexpected production errors use safe output without stack traces', async () => {
  await withEnv({ NODE_ENV: 'production', SHOW_ERROR_STACKS: 'true' }, async () => {
    const server = await listen(buildErrorTestApp());

    try {
      const response = await request(server, '/unexpected');

      assert.equal(response.statusCode, 500);
      assert.equal(response.body.error.code, ERROR_CODES.INTERNAL_SERVER_ERROR);
      assert.equal(response.body.error.message, 'An unexpected server error occurred.');
      assert.equal(response.body.error.stack, undefined);
    } finally {
      await closeServer(server);
    }
  });
});

test('development stack traces are included only when explicitly enabled', async () => {
  await withEnv({ NODE_ENV: 'development', SHOW_ERROR_STACKS: 'true' }, async () => {
    const server = await listen(buildErrorTestApp());

    try {
      const response = await request(server, '/unexpected');

      assert.equal(response.statusCode, 500);
      assert.equal(response.body.error.code, ERROR_CODES.INTERNAL_SERVER_ERROR);
      assert.equal(typeof response.body.error.stack, 'string');
    } finally {
      await closeServer(server);
    }
  });

  assert.equal(shouldExposeStack({ NODE_ENV: 'development', SHOW_ERROR_STACKS: 'false' }), false);
  assert.equal(shouldExposeStack({ NODE_ENV: 'production', SHOW_ERROR_STACKS: 'true' }), false);
});

test('known auth and database constraint errors map to standard codes', () => {
  const authn = mapKnownError({ status: 401, message: 'Login required.' });
  const authz = mapKnownError({ statusCode: 403, message: 'Forbidden.' });
  const constraint = mapKnownError({ code: '23514' });

  assert.equal(authn.code, ERROR_CODES.AUTHENTICATION_REQUIRED);
  assert.equal(authn.statusCode, 401);
  assert.equal(authz.code, ERROR_CODES.AUTHORIZATION_FAILED);
  assert.equal(authz.statusCode, 403);
  assert.equal(constraint.code, ERROR_CODES.DATABASE_CONSTRAINT_VIOLATION);
  assert.equal(constraint.statusCode, 400);
});
