require('dotenv').config();

const pool = require('../config/db');
const { logAction } = require('../utils/audit');
const { monitorSlaBreaches } = require('../utils/slaMonitor');

async function main() {
  const escalated = await monitorSlaBreaches(pool, logAction);
  console.log(`[sla] Processed SLA monitor sweep. Escalated ${escalated} ticket(s).`);
}

main()
  .catch((err) => {
    console.error('[sla] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
