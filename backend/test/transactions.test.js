const test = require('node:test');
const assert = require('node:assert/strict');

const { withTransaction } = require('../src/utils/transactions');

test('withTransaction commits successful work and releases the client', async () => {
  const queries = [];
  let released = false;

  const client = {
    async query(sql) {
      queries.push(sql);
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };

  const executor = {
    async connect() {
      return client;
    },
  };

  const result = await withTransaction(async (tx) => {
    assert.equal(tx, client);
    await tx.query('SELECT 1');
    return 'ok';
  }, executor);

  assert.equal(result, 'ok');
  assert.deepEqual(queries, ['BEGIN', 'SELECT 1', 'COMMIT']);
  assert.equal(released, true);
});

test('withTransaction rolls back failed work and releases the client', async () => {
  const queries = [];
  let released = false;

  const client = {
    async query(sql) {
      queries.push(sql);
      if (sql === 'SELECT explode') {
        throw new Error('boom');
      }
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };

  const executor = {
    async connect() {
      return client;
    },
  };

  await assert.rejects(
    withTransaction(async (tx) => {
      await tx.query('SELECT explode');
    }, executor),
    /boom/
  );

  assert.deepEqual(queries, ['BEGIN', 'SELECT explode', 'ROLLBACK']);
  assert.equal(released, true);
});
