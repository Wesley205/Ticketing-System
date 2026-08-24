const pool = require('../config/db');
const { logAction } = require('../utils/audit');
const { expireTemporaryAccounts } = require('../utils/accountExpiry');

expireTemporaryAccounts(pool, logAction)
  .then((count) => {
    console.log(`[accounts] Expired ${count} temporary account(s).`);
  })
  .catch((err) => {
    console.error('[accounts] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
