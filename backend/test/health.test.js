const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAppHealth,
  buildOperationsHealth,
  buildReadiness,
  checkDatabase,
} = require('../src/services/health');

function createPool({ failMigrations = false } = {}) {
  const queries = [];

  return {
    queries,
    pool: {
      async query(sql) {
        queries.push(sql);

        if (/SELECT 1 AS ok/i.test(sql)) {
          return { rows: [{ ok: 1 }] };
        }

        if (/FROM schema_migrations/i.test(sql)) {
          if (failMigrations) throw new Error('missing migrations table');
          return {
            rows: [
              {
                filename: '009_operational_job_runs.sql',
                applied_at: new Date('2026-01-01T00:00:00Z'),
              },
            ],
          };
        }

        if (/FROM operational_job_runs/i.test(sql)) {
          return {
            rows: [
              {
                job_name: 'sla_monitor',
                status: 'succeeded',
                started_at: new Date('2026-01-01T00:00:00Z'),
              },
            ],
          };
        }

        if (/FROM notification_deliveries/i.test(sql)) {
          return { rows: [{ delivery_status: 'pending', count: 2 }] };
        }

        if (/FROM service_requests/i.test(sql)) {
          return { rows: [{ response_overdue: 1, resolution_overdue: 3 }] };
        }

        throw new Error(`unexpected SQL: ${sql}`);
      },
    },
  };
}

test('buildAppHealth returns a minimal public app health payload', () => {
  const payload = buildAppHealth({ requestId: 'req-12345678' });

  assert.equal(payload.status, 'ok');
  assert.equal(payload.service, 'nsc-ict-service-desk-api');
  assert.equal(payload.request_id, 'req-12345678');
  assert.equal(typeof payload.uptime_seconds, 'number');
});

test('checkDatabase validates PostgreSQL connectivity', async () => {
  const { pool, queries } = createPool();

  const result = await checkDatabase(pool);

  assert.equal(result.status, 'ok');
  assert.equal(queries.some((sql) => /SELECT 1 AS ok/i.test(sql)), true);
});

test('buildReadiness reports not ready when migration state cannot be read', async () => {
  const { pool } = createPool({ failMigrations: true });

  const payload = await buildReadiness(pool, { requestId: 'req-12345678' });

  assert.equal(payload.ready, false);
  assert.equal(payload.status, 'error');
  assert.equal(payload.checks.database.status, 'ok');
  assert.equal(payload.checks.migrations.status, 'error');
});

test('buildOperationsHealth returns protected operational checks', async () => {
  const { pool } = createPool();

  const payload = await buildOperationsHealth(pool, { requestId: 'req-12345678' });

  assert.equal(payload.status, 'ok');
  assert.equal(payload.migrations.latest.filename, '009_operational_job_runs.sql');
  assert.equal(payload.jobs.jobs[0].job_name, 'sla_monitor');
  assert.equal(payload.notification_queue.by_status[0].delivery_status, 'pending');
  assert.equal(payload.sla_overdue.response_overdue, 1);
  assert.equal(payload.sla_overdue.resolution_overdue, 3);
});
