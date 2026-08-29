async function runExclusiveJob({ pool, jobName, task, metadata = {} }) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error('A PostgreSQL pool is required to run an operational job.');
  }
  if (!jobName) {
    throw new Error('Job name is required.');
  }
  if (typeof task !== 'function') {
    throw new Error('Job task must be a function.');
  }

  const client = await pool.connect();
  const startedAt = Date.now();
  let lockAcquired = false;
  let runId = null;

  try {
    const lockResult = await client.query(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      [jobName]
    );
    lockAcquired = lockResult.rows[0]?.locked === true;

    if (!lockAcquired) {
      await insertJobRun(client, {
        jobName,
        status: 'skipped',
        startedAt,
        resultSummary: 'Another instance is already running this job.',
        metadata,
      });
      return { status: 'skipped', skipped: true, result: null };
    }

    const started = await insertJobRun(client, {
      jobName,
      status: 'running',
      startedAt,
      metadata,
    });
    runId = started.job_run_id;

    const result = await task();
    await finishJobRun(client, {
      runId,
      status: 'succeeded',
      startedAt,
      resultSummary: formatResultSummary(result),
    });

    return { status: 'succeeded', skipped: false, result };
  } catch (err) {
    if (runId) {
      await finishJobRun(client, {
        runId,
        status: 'failed',
        startedAt,
        errorMessage: err.message,
      });
    }
    throw err;
  } finally {
    if (lockAcquired) {
      try {
        await client.query('SELECT pg_advisory_unlock(hashtext($1))', [jobName]);
      } catch (unlockErr) {
        console.error(`[jobs] Failed to release job lock for ${jobName}:`, unlockErr.message);
      }
    }
    client.release();
  }
}

async function insertJobRun(client, { jobName, status, startedAt, resultSummary = null, metadata = {} }) {
  const result = await client.query(
    `INSERT INTO operational_job_runs
      (job_name, status, started_at, finished_at, duration_ms, result_summary, metadata_json)
     VALUES ($1, $2, NOW(), $5, $6, $3, $4::jsonb)
     RETURNING job_run_id`,
    [
      jobName,
      status,
      resultSummary,
      JSON.stringify(metadata || {}),
      status === 'running' ? null : new Date(),
      status === 'running' ? null : Date.now() - startedAt,
    ]
  );
  return result.rows[0];
}

async function finishJobRun(client, { runId, status, startedAt, resultSummary = null, errorMessage = null }) {
  await client.query(
    `UPDATE operational_job_runs
     SET status = $2,
         finished_at = NOW(),
         duration_ms = $3,
         result_summary = $4,
         error_message = $5
     WHERE job_run_id = $1`,
    [runId, status, Date.now() - startedAt, resultSummary, errorMessage]
  );
}

function formatResultSummary(result) {
  if (result === undefined || result === null) return null;
  if (typeof result === 'number') return `Processed ${result} item(s).`;
  if (typeof result === 'string') return result;
  return JSON.stringify(result);
}

module.exports = {
  formatResultSummary,
  runExclusiveJob,
};
