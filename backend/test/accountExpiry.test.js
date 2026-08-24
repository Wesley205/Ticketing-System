const test = require('node:test');
const assert = require('node:assert/strict');

const { AUTO_EXPIRY_REASON, expireTemporaryAccounts } = require('../src/utils/accountExpiry');

test('expireTemporaryAccounts deactivates accounts and logs each result', async () => {
  const queries = [];
  const pool = {
    async query(sql, params) {
      queries.push({ sql, params });
      return {
        rows: [
          { user_id: 4, full_name: 'Temp User One' },
          { user_id: 5, full_name: 'Temp User Two' },
        ],
      };
    },
  };

  const logCalls = [];
  const count = await expireTemporaryAccounts(pool, async (...args) => logCalls.push(args));

  assert.equal(count, 2);
  assert.equal(queries.length, 1);
  assert.equal(queries[0].params[0], AUTO_EXPIRY_REASON);
  assert.equal(logCalls.length, 2);
  assert.equal(logCalls[0][1], 'Temporary account expired');
});
