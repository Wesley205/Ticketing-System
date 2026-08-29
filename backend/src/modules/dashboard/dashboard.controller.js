const service = require('./dashboard.service');
const { DASHBOARD_ERROR_MESSAGES } = require('./dashboard.constants');

async function stats(req, res) {
  try {
    const data = await service.getDashboardStats(req.user, req.query);
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(400).json({ error: err.message || DASHBOARD_ERROR_MESSAGES.statsFailed });
  }
}

module.exports = {
  stats,
};
