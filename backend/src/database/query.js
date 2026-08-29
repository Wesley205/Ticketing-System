const { pool } = require('./pool');
const { mapDatabaseError } = require('./errors');
const { logError, logInfo } = require('../logging/logger');

function shouldLogQueryTiming(env = process.env) {
  return String(env.NODE_ENV || '').toLowerCase() === 'development';
}

function summarizeQuery(text) {
  return String(text || '').trim().split(/\s+/).slice(0, 6).join(' ');
}

async function query(text, params = [], options = {}) {
  const executor = options.executor || pool;
  const startedAt = process.hrtime.bigint();

  try {
    const result = await executor.query(text, params);

    if (shouldLogQueryTiming(options.env)) {
      const durationMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1_000_000);
      logInfo('database_query_completed', {
        duration_ms: durationMs,
        query_summary: summarizeQuery(text),
        parameter_count: Array.isArray(params) ? params.length : 0,
        row_count: result.rowCount,
      });
    }

    return result;
  } catch (err) {
    const mapped = mapDatabaseError(err);
    logError('database_query_failed', err, {
      mapped_code: mapped?.code || 'UNKNOWN_DATABASE_ERROR',
      query_summary: summarizeQuery(text),
      parameter_count: Array.isArray(params) ? params.length : 0,
    });
    throw err;
  }
}

module.exports = {
  query,
  shouldLogQueryTiming,
  summarizeQuery,
};
