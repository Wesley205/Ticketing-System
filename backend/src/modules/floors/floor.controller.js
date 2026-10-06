const service = require('./floor.service');

async function listFloors(req, res, next) {
  try {
    const includeInactive = ['admin', 'ict_officer'].includes(req.user?.role)
      && req.query.include_inactive === 'true';
    const floors = await service.listFloors({ includeInactive });
    return res.json(floors);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listFloors,
};
