const { canViewReports } = require('../../utils/authorization');

function canAccessReports(user) {
  return canViewReports(user);
}

module.exports = {
  canAccessReports,
};
