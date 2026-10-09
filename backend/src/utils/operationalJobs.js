const pool = require('../config/db');
const { logAction } = require('./audit');
const { expireTemporaryAccounts } = require('./accountExpiry');
const { runMaintenanceMonitor } = require('./maintenanceMonitor');
const { processNotificationQueue } = require('./notificationProcessor');
const { monitorSlaBreaches } = require('./slaMonitor');
const { runExclusiveJob } = require('./jobRunner');

const JOBS = Object.freeze([
  { name: 'notification_queue', intervalMinutes: 5, task: () => processNotificationQueue(pool) },
  { name: 'sla_monitor', intervalMinutes: 5, task: () => monitorSlaBreaches(pool, logAction) },
  { name: 'maintenance_monitor', intervalMinutes: 60, task: () => runMaintenanceMonitor({ pool, logAction }) },
  { name: 'account_expiry_sweep', intervalMinutes: 60, task: () => expireTemporaryAccounts(pool, logAction) },
]);

async function getLastSuccessfulRun(jobName, executor = pool) {
  const result = await executor.query(
    `SELECT MAX(finished_at) AS last_run_at
     FROM operational_job_runs
     WHERE job_name = $1 AND status = 'succeeded'`,
    [jobName],
  );
  return result.rows[0]?.last_run_at || null;
}

function isDue(lastRunAt, intervalMinutes, now = Date.now()) {
  if (!lastRunAt) return true;
  return now - new Date(lastRunAt).getTime() >= intervalMinutes * 60 * 1000;
}

async function runOperationalJobs({ force = false, source = 'activity' } = {}) {
  const outcomes = [];
  for (const job of JOBS) {
    const lastRunAt = await getLastSuccessfulRun(job.name);
    if (!force && !isDue(lastRunAt, job.intervalMinutes)) {
      outcomes.push({ job: job.name, status: 'not_due', last_run_at: lastRunAt });
      continue;
    }
    const outcome = await runExclusiveJob({
      pool,
      jobName: job.name,
      metadata: { source },
      task: job.task,
    });
    outcomes.push({
      job: job.name,
      status: outcome.status,
      processed: typeof outcome.result === 'number' ? outcome.result : null,
    });
  }
  return outcomes;
}

module.exports = { JOBS, getLastSuccessfulRun, isDue, runOperationalJobs };
