const {
  canManageDepartments,
  canViewAllOperationalData,
  canViewDepartment,
} = require('../../utils/authorization');

function buildDepartmentListScope(user) {
  return {
    can_view_all_operational_data: canViewAllOperationalData(user),
    department_id: user?.department_id || null,
  };
}

module.exports = {
  buildDepartmentListScope,
  canCreateDepartment: canManageDepartments,
  canListDepartments: (user) => Boolean(user?.user_id),
  canUpdateDepartment: canManageDepartments,
  canViewAllOperationalData,
  canViewDepartment,
};
