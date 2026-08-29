const pool = require('../config/db');
const { logAction } = require('../utils/audit');
const { expireTemporaryAccounts } = require('../utils/accountExpiry');
const { runExclusiveJob } = require('../utils/jobRunner');

runExclusiveJob({
  pool,
  jobName: 'account_expiry_sweep',
  task: () => expireTemporaryAccounts(pool, logAction),
})
  .then((outcome) => {
    if (outcome.skipped) {
      console.log('[accounts] Account expiry sweep skipped because another instance is running it.');
      return;
    }
    console.log(`[accounts] Expired ${outcome.result} temporary account(s).`);
  })
  .catch((err) => {
    console.error('[accounts] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
