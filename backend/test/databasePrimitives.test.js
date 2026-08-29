const test = require('node:test');
const assert = require('node:assert/strict');

const { mapDatabaseError } = require('../src/database/errors');
const { createPool, shutdownPool } = require('../src/database/pool');
const { query, shouldLogQueryTiming, summarizeQuery } = require('../src/database/query');
const { withTransaction } = require('../src/database/transaction');

test('query helper returns successful query result', async () => {
  const executor = {
    async query(sql, params) {
      assert.equal(sql, 'SELECT $1::int AS value');
      assert.deepEqual(params, [1]);
      return { rows: [{ value: 1 }], rowCount: 1 };
    },
  };

  const result = await query('SELECT $1::int AS value', [1], { executor, env: { NODE_ENV: 'test' } });

  assert.equal(result.rows[0].value, 1);
  assert.equal(result.rowCount, 1);
});

test('query helper rethrows failed database query without exposing parameters', async () => {
  const dbError = Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    detail: 'sensitive detail',
  });
  const executor = {
    async query() {
      throw dbError;
    },
  };

  await assert.rejects(
    () => query('INSERT INTO users(password_hash) VALUES ($1)', ['secret-password'], { executor }),
    /duplicate key/,
  );
});

test('query timing is development-only and query summaries omit parameters', () => {
  assert.equal(shouldLogQueryTiming({ NODE_ENV: 'development' }), true);
  assert.equal(shouldLogQueryTiming({ NODE_ENV: 'production' }), false);
  assert.equal(
    summarizeQuery('SELECT * FROM users WHERE password_hash = $1 AND email = $2'),
    'SELECT * FROM users WHERE password_hash',
  );
});

test('database transaction commits successful work and releases client', async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };
  const executor = {
    async connect() {
      calls.push('CONNECT');
      return client;
    },
  };

  const result = await withTransaction(async (tx) => {
    assert.equal(tx, client);
    await tx.query('SELECT 1');
    return 'ok';
  }, executor);

  assert.equal(result, 'ok');
  assert.deepEqual(calls, ['CONNECT', 'BEGIN', 'SELECT 1', 'COMMIT']);
  assert.equal(released, true);
});

test('database transaction rolls back failed work and releases client', async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql) {
      calls.push(sql);
      if (sql === 'SELECT fail') throw new Error('boom');
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };
  const executor = {
    async connect() {
      calls.push('CONNECT');
      return client;
    },
  };

  await assert.rejects(
    () => withTransaction(async (tx) => {
      await tx.query('SELECT fail');
    }, executor),
    /boom/,
  );

  assert.deepEqual(calls, ['CONNECT', 'BEGIN', 'SELECT fail', 'ROLLBACK']);
  assert.equal(released, true);
});

test('shutdownPool ends the configured pool', async () => {
  let ended = false;
  await shutdownPool({
    async end() {
      ended = true;
    },
  });

  assert.equal(ended, true);
});

test('createPool applies pool sizing and timeout configuration', async () => {
  const pool = createPool({
    PGHOST: 'localhost',
    PGPORT: '5432',
    PGDATABASE: 'nsc',
    PGUSER: 'user',
    PGPASSWORD: 'pw',
    PGPOOL_MAX: '7',
    PGIDLE_TIMEOUT_MS: '8000',
    PGCONNECTION_TIMEOUT_MS: '3000',
  });

  try {
    assert.equal(pool.options.max, 7);
    assert.equal(pool.options.idleTimeoutMillis, 8000);
    assert.equal(pool.options.connectionTimeoutMillis, 3000);
  } finally {
    await pool.end();
  }
});

test('database error mapper normalizes duplicate and foreign key errors', () => {
  const duplicate = mapDatabaseError({ code: '23505' });
  const foreignKey = mapDatabaseError({ code: '23503' });

  assert.equal(duplicate.code, 'DUPLICATE_RESOURCE');
  assert.equal(duplicate.statusCode, 409);
  assert.equal(foreignKey.code, 'FOREIGN_KEY_VIOLATION');
  assert.equal(foreignKey.statusCode, 409);
});
