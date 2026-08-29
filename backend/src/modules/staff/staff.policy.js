const {
  canManageUsers,
  canViewAllOperationalData,
  canViewTechnicianDirectory,
} = require('../../utils/authorization');

module.exports = {
  canCreateStaffAccount: canManageUsers,
  canExtendTemporaryAccount: canManageUsers,
  canListStaff: canViewAllOperationalData,
  canListTechnicians: canViewTechnicianDirectory,
  canUpdateStaffAccount: canManageUsers,
  canUpdateStaffStatus: canManageUsers,
};
