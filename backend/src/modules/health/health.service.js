const SERVICE_NAME = 'nsc-ict-service-desk-api';

function getPackageVersion() {
  try {
    return require('../../../package.json').version || 'unknown';
  } catch (err) {
    return 'unknown';
  }
}

function buildAppHealth({ requestId } = {}) {
  return {
    status: 'ok',
    service: SERVICE_NAME,
    version: getPackageVersion(),
    uptime_seconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    request_id: requestId || null,
  };
}

async function checkDatabase(pool) {
  const startedAt = Date.now();
  await pool.query('SELECT 1 AS ok');

  return {
    status: 'ok',
    latency_ms: Date.now() - startedAt,
  };
}

async function getMigrationState(pool) {
  const result = await pool.query(
    `SELECT filename, applied_at
     FROM schema_migrations
     ORDER BY filename DESC
     LIMIT 10`,
  );

  return {
    status: 'ok',
    latest: result.rows[0] || null,
    recent: result.rows,
  };
}

async function getRecentJobState(pool) {
  const result = await pool.query(
    `SELECT DISTINCT ON (job_name)
            job_name, status, started_at, finished_at, duration_ms,
            result_summary, error_message
     FROM operational_job_runs
     ORDER BY job_name, started_at DESC`,
  );

  return {
    status: 'ok',
    jobs: result.rows,
  };
}

async function getNotificationQueueDepth(pool) {
  const result = await pool.query(
    `SELECT delivery_status, COUNT(*)::integer AS count
     FROM notification_deliveries
     GROUP BY delivery_status`,
  );

  return {
    status: 'ok',
    by_status: result.rows,
  };
}

async function getSlaOverdueCounts(pool) {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE sla_response_due_at IS NOT NULL
           AND first_response_at IS NULL
           AND sla_response_due_at < NOW()
           AND status NOT IN ('Resolved', 'Closed', 'Cancelled')
       )::integer AS response_overdue,
       COUNT(*) FILTER (
         WHERE sla_resolution_due_at IS NOT NULL
           AND date_resolved IS NULL
           AND sla_resolution_due_at < NOW()
           AND status NOT IN ('Resolved', 'Closed', 'Cancelled')
       )::integer AS resolution_overdue
     FROM service_requests`,
  );

  return {
    status: 'ok',
    ...result.rows[0],
  };
}

async function buildReadiness(pool, { requestId } = {}) {
  const checks = {
    database: null,
    migrations: null,
  };

  try {
    checks.database = await checkDatabase(pool);
  } catch (err) {
    checks.database = { status: 'error' };
  }

  try {
    checks.migrations = await getMigrationState(pool);
  } catch (err) {
    checks.migrations = { status: 'error' };
  }

  const ready = Object.values(checks).every((check) => check.status === 'ok');

  return {
    status: ready ? 'ok' : 'error',
    ready,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    request_id: requestId || null,
    checks,
  };
}

async function buildOperationsHealth(pool, { requestId } = {}) {
  const [migrations, jobs, notificationQueue, slaOverdue] = await Promise.all([
    getMigrationState(pool),
    getRecentJobState(pool),
    getNotificationQueueDepth(pool),
    getSlaOverdueCounts(pool),
  ]);

  return {
    status: 'ok',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    request_id: requestId || null,
    migrations,
    jobs,
    notification_queue: notificationQueue,
    sla_overdue: slaOverdue,
  };
}

module.exports = {
  SERVICE_NAME,
  buildAppHealth,
  buildOperationsHealth,
  buildReadiness,
  checkDatabase,
  getMigrationState,
  getNotificationQueueDepth,
  getPackageVersion,
  getRecentJobState,
  getSlaOverdueCounts,
};
