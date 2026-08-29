require('dotenv').config();

const pool = require('../config/db');
const { processNotificationQueue } = require('../utils/notificationProcessor');
const { runExclusiveJob } = require('../utils/jobRunner');

async function main() {
  const outcome = await runExclusiveJob({
    pool,
    jobName: 'notification_queue',
    task: () => processNotificationQueue(pool),
  });
  if (outcome.skipped) {
    console.log('[notifications] Queue skipped because another instance is running it.');
    return;
  }
  console.log(`[notifications] Processed ${outcome.result} queued delivery item(s).`);
}

main()
  .catch((err) => {
    console.error('[notifications] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
