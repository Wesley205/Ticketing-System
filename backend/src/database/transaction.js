const { pool } = require('./pool');
const { logError } = require('../logging/logger');

async function withTransaction(work, executor = pool) {
  const client = await executor.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      logError('database_transaction_rollback_failed', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  withTransaction,
};
