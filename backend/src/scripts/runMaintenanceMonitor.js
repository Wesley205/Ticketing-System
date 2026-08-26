require('dotenv').config();

const pool = require('../config/db');
const { logAction } = require('../utils/audit');
const { runMaintenanceMonitor } = require('../utils/maintenanceMonitor');

async function main() {
  try {
    await runMaintenanceMonitor({ pool, logAction });
    console.log('[maintenance-monitor] Completed successfully.');
  } catch (err) {
    console.error('[maintenance-monitor] Failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
