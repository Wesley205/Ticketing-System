function getDefaultExecutor() {
  return require('../config/db');
}

async function withTransaction(work, executor = getDefaultExecutor()) {
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
      console.error('[db] Transaction rollback failed:', rollbackErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { withTransaction };
