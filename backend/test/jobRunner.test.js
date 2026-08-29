const test = require('node:test');
const assert = require('node:assert/strict');

const { formatResultSummary, runExclusiveJob } = require('../src/utils/jobRunner');

function createPool({ locked = true, failTask = false } = {}) {
  const queries = [];
  let nextRunId = 1;
  const client = {
    async query(sql, params = []) {
      queries.push({ sql, params });
      if (/pg_try_advisory_lock/i.test(sql)) {
        return { rows: [{ locked }] };
      }
      if (/INSERT INTO operational_job_runs/i.test(sql)) {
        return { rows: [{ job_run_id: nextRunId++ }] };
      }
      if (/UPDATE operational_job_runs/i.test(sql)) {
        return { rows: [] };
      }
      if (/pg_advisory_unlock/i.test(sql)) {
        return { rows: [{ pg_advisory_unlock: true }] };
      }
      throw new Error(`unexpected SQL: ${sql}`);
    },
    release() {
      queries.push({ sql: 'RELEASE', params: [] });
    },
  };

  return {
    queries,
    pool: {
      async connect() {
        return client;
      },
    },
    task: async () => {
      if (failTask) throw new Error('job exploded');
      return 3;
    },
  };
}

test('runExclusiveJob records succeeded runs and releases advisory lock', async () => {
  const { pool, queries, task } = createPool();

  const outcome = await runExclusiveJob({
    pool,
    jobName: 'sla_monitor',
    task,
    metadata: { source: 'test' },
  });

  assert.equal(outcome.status, 'succeeded');
  assert.equal(outcome.result, 3);
  assert.equal(queries.some((q) => /UPDATE operational_job_runs/i.test(q.sql) && q.params[1] === 'succeeded'), true);
  assert.equal(queries.some((q) => /pg_advisory_unlock/i.test(q.sql)), true);
  assert.equal(queries.at(-1).sql, 'RELEASE');
});

test('runExclusiveJob records skipped runs when another instance holds the lock', async () => {
  const { pool, queries } = createPool({ locked: false });
  let ran = false;

  const outcome = await runExclusiveJob({
    pool,
    jobName: 'notification_queue',
    task: async () => {
      ran = true;
    },
  });

  assert.equal(outcome.skipped, true);
  assert.equal(ran, false);
  assert.equal(queries.some((q) => /INSERT INTO operational_job_runs/i.test(q.sql) && q.params[1] === 'skipped'), true);
  assert.equal(queries.some((q) => /pg_advisory_unlock/i.test(q.sql)), false);
});

test('runExclusiveJob records failed runs before rethrowing', async () => {
  const { pool, queries, task } = createPool({ failTask: true });

  await assert.rejects(
    () => runExclusiveJob({ pool, jobName: 'account_expiry_sweep', task }),
    /job exploded/
  );

  assert.equal(queries.some((q) => /UPDATE operational_job_runs/i.test(q.sql) && q.params[1] === 'failed'), true);
  assert.equal(queries.some((q) => /pg_advisory_unlock/i.test(q.sql)), true);
});

test('formatResultSummary normalizes common job results', () => {
  assert.equal(formatResultSummary(2), 'Processed 2 item(s).');
  assert.equal(formatResultSummary('ok'), 'ok');
  assert.equal(formatResultSummary({ processed: 4 }), '{"processed":4}');
  assert.equal(formatResultSummary(null), null);
});
