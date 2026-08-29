const { Pool } = require('pg');
const { getDatabaseConfig } = require('../config/env');
const { logError, logInfo } = require('../logging/logger');

function createPool(env = process.env, options = {}) {
  const pool = new Pool({
    ...getDatabaseConfig(env),
    ...options,
  });

  pool.on('connect', () => {
    logInfo('database_pool_connected');
  });

  pool.on('error', (err) => {
    logError('database_pool_idle_error', err);
  });

  return pool;
}

const pool = createPool();

async function shutdownPool(targetPool = pool) {
  if (targetPool && typeof targetPool.end === 'function') {
    await targetPool.end();
  }
}

module.exports = {
  createPool,
  pool,
  shutdownPool,
};
