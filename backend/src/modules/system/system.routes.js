const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const { runOperationalJobs } = require('../../utils/operationalJobs');

const router = express.Router();

function hasValidCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.headers.authorization === `Bearer ${secret}`;
}

router.post('/jobs/activity', requireAuth, async (_req, res, next) => {
  try {
    const jobs = await runOperationalJobs({ source: 'authenticated_activity' });
    return res.json({ status: 'ok', jobs });
  } catch (err) {
    return next(err);
  }
});

router.get('/jobs/daily', async (req, res, next) => {
  if (!hasValidCronSecret(req)) {
    return res.status(401).json({ error: 'Invalid scheduled-job credentials.' });
  }
  try {
    const jobs = await runOperationalJobs({ force: true, source: 'vercel_daily_cron' });
    return res.json({ status: 'ok', jobs });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
module.exports.hasValidCronSecret = hasValidCronSecret;
