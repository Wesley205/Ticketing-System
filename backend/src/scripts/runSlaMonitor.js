require('dotenv').config();

const pool = require('../config/db');
const { logAction } = require('../utils/audit');
const { monitorSlaBreaches } = require('../utils/slaMonitor');
const { runExclusiveJob } = require('../utils/jobRunner');

async function main() {
  const outcome = await runExclusiveJob({
    pool,
    jobName: 'sla_monitor',
    task: () => monitorSlaBreaches(pool, logAction),
  });
  if (outcome.skipped) {
    console.log('[sla] SLA monitor skipped because another instance is running it.');
    return;
  }
  console.log(`[sla] Processed SLA monitor sweep. Escalated ${outcome.result} ticket(s).`);
}

main()
  .catch((err) => {
    console.error('[sla] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
