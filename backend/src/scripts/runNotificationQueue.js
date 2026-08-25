require('dotenv').config();

const pool = require('../config/db');
const { processNotificationQueue } = require('../utils/notificationProcessor');

async function main() {
  const processed = await processNotificationQueue(pool);
  console.log(`[notifications] Processed ${processed} queued delivery item(s).`);
}

main()
  .catch((err) => {
    console.error('[notifications] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
