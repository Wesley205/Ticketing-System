const { TEMPORARY_USER_TYPES } = require('../config/authPolicy');
const { runExclusiveJob } = require('./jobRunner');

const AUTO_EXPIRY_REASON = 'Automatic account expiry after the approved end date';

async function expireTemporaryAccounts(pool, logAction) {
  const result = await pool.query(
    `UPDATE users
     SET is_active = FALSE,
         deactivated_at = COALESCE(deactivated_at, NOW()),
         deactivation_reason = COALESCE(deactivation_reason, $1)
     WHERE is_active = TRUE
       AND user_type = ANY($2)
       AND account_expiration_date IS NOT NULL
       AND account_expiration_date < CURRENT_DATE
     RETURNING user_id, full_name`,
    [AUTO_EXPIRY_REASON, TEMPORARY_USER_TYPES]
  );

  for (const row of result.rows) {
    if (logAction) {
      await logAction(null, 'Temporary account expired', 'user', row.user_id, `Automatically deactivated ${row.full_name}`);
    }
  }

  return result.rows.length;
}

function startExpirySweep({ pool, logAction }) {
  const intervalMinutes = Number(process.env.ACCOUNT_EXPIRY_SWEEP_INTERVAL_MINUTES || 60);
  if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
    return () => {};
  }

  const runSweep = async () => {
    try {
      await runExclusiveJob({
        pool,
        jobName: 'account_expiry_sweep',
        task: () => expireTemporaryAccounts(pool, logAction),
      });
    } catch (err) {
      console.error('[accounts] Failed to process account expiry sweep:', err.message);
    }
  };

  if (String(process.env.ACCOUNT_EXPIRY_SWEEP_ON_START || 'true').toLowerCase() !== 'false') {
    runSweep();
  }

  const timer = setInterval(runSweep, intervalMinutes * 60 * 1000);
  if (typeof timer.unref === 'function') {
    timer.unref();
  }

  return () => clearInterval(timer);
}

module.exports = {
  AUTO_EXPIRY_REASON,
  expireTemporaryAccounts,
  runExclusiveJob,
  startExpirySweep,
};
