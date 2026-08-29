require('dotenv').config();

const pool = require('../config/db');
const { logAction } = require('../utils/audit');
const { runMaintenanceMonitor } = require('../utils/maintenanceMonitor');
const { runExclusiveJob } = require('../utils/jobRunner');

async function main() {
  try {
    const outcome = await runExclusiveJob({
      pool,
      jobName: 'maintenance_monitor',
      task: () => runMaintenanceMonitor({ pool, logAction }),
    });
    console.log(outcome.skipped
      ? '[maintenance-monitor] Skipped because another instance is running it.'
      : '[maintenance-monitor] Completed successfully.');
  } catch (err) {
    console.error('[maintenance-monitor] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
