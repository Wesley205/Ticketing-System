const {
  canCreateInvitation,
  canManageUsers,
  canViewAllOperationalData,
} = require('../../utils/authorization');

function canListInvitations(user) {
  return canViewAllOperationalData(user);
}

function canIssueInvitation(user) {
  return canCreateInvitation(user);
}

function canRevokeInvitation(user) {
  return canManageUsers(user);
}

module.exports = {
  canIssueInvitation,
  canListInvitations,
  canRevokeInvitation,
};
