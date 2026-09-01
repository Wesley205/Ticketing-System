export const ROLES = Object.freeze({
  STAFF: 'staff',
  TECHNICIAN: 'technician',
  ICT_OFFICER: 'ict_officer',
  ADMIN: 'admin',
});

export const ROUTE_PERMISSIONS = Object.freeze({
  '/dashboard': 'can_access_dashboard',
  '/service-requests': 'can_access_service_desk',
  '/technician': 'can_access_technician_portal',
  '/assets': 'can_access_assets',
  '/maintenance': 'can_manage_maintenance',
  '/staff': 'can_access_staff_portal',
  '/departments': 'can_access_departments',
  '/knowledge-base': 'can_access_knowledge_base',
  '/reports': 'can_view_reports',
  '/audit-logs': 'can_view_audit_logs',
});

export function getRoleLabel(role) {
  return {
    [ROLES.STAFF]: 'Staff/User',
    [ROLES.TECHNICIAN]: 'Technician',
    [ROLES.ICT_OFFICER]: 'ICT Officer',
    [ROLES.ADMIN]: 'Administrator',
  }[role] || 'User';
}

function buildFallbackPermissions(user = {}) {
  const role = user.role || null;
  const isAdmin = role === ROLES.ADMIN;
  const isIctOfficer = role === ROLES.ICT_OFFICER;
  const isTechnician = role === ROLES.TECHNICIAN;
  const canViewAllOperationalData = isAdmin || isIctOfficer;

  return {
    can_view_all_operational_data: canViewAllOperationalData,
    can_manage_users: isAdmin,
    can_manage_departments: isAdmin,
    can_access_departments: Boolean(user.user_id),
    can_view_reports: canViewAllOperationalData,
    can_view_audit_logs: canViewAllOperationalData,
    can_create_invitation: isAdmin,
    can_view_technician_directory: canViewAllOperationalData,
    can_assign_service_request: canViewAllOperationalData,
    can_manage_service_request_assignments: canViewAllOperationalData,
    can_add_internal_ticket_note: canViewAllOperationalData || isTechnician,
    can_manage_assets: canViewAllOperationalData,
    can_manage_maintenance: canViewAllOperationalData || isTechnician,
    can_manage_knowledge_base: canViewAllOperationalData,
    can_provide_knowledge_base_feedback: Boolean(user.user_id),
    can_access_staff_portal: canViewAllOperationalData,
    can_access_department_portal: canViewAllOperationalData,
    can_access_technician_portal: isTechnician,
    can_access_admin_portal: isAdmin,
    can_access_notifications: Boolean(user.user_id),
    can_access_dashboard: Boolean(user.user_id),
    can_access_service_desk: Boolean(user.user_id),
    can_access_assets: Boolean(user.user_id),
    can_access_knowledge_base: Boolean(user.user_id),
  };
}

export function buildAccessProfile(user = {}) {
  const role = user.role || null;
  const isAdmin = role === ROLES.ADMIN;
  const isIctOfficer = role === ROLES.ICT_OFFICER;
  const isTechnician = role === ROLES.TECHNICIAN;
  const canViewAllOperationalData = isAdmin || isIctOfficer;

  return {
    role,
    roleLabel: getRoleLabel(role),
    role_label: getRoleLabel(role),
    user_type: user.user_type || null,
    department_id: user.department_id || null,
    permissions: buildFallbackPermissions(user),
    scope: {
      organizationScope: canViewAllOperationalData,
      assignedOnly: isTechnician,
      departmentScope: !canViewAllOperationalData && !isTechnician && Boolean(user.department_id),
      userOnly: !canViewAllOperationalData,
      organization_scope: canViewAllOperationalData,
      assigned_only: isTechnician,
      department_scope: !canViewAllOperationalData && !isTechnician && Boolean(user.department_id),
      user_only: !canViewAllOperationalData,
    },
    primary_portal: isAdmin
      ? 'administrator'
      : isIctOfficer
        ? 'ict_officer'
        : isTechnician
          ? 'technician'
          : user.department_id
            ? 'department_supervisor'
            : 'staff',
  };
}

export function normalizeAccessProfile(profile, user = {}) {
  if (!profile) {
    return buildAccessProfile(user);
  }

  return {
    ...buildAccessProfile(user),
    ...profile,
    permissions: {
      ...buildAccessProfile(user).permissions,
      ...(profile.permissions || {}),
    },
    scope: {
      ...buildAccessProfile(user).scope,
      ...(profile.scope || {}),
    },
  };
}

export function hasPermission(profile, permissionKey) {
  if (!permissionKey) return true;
  return profile?.permissions?.[permissionKey] === true;
}

export function canAccessRoute(profile, route) {
  const permissionKey = route?.permissionKey || ROUTE_PERMISSIONS[route?.path] || ROUTE_PERMISSIONS[route];
  return hasPermission(profile, permissionKey);
}

export function getDefaultAuthenticatedRoute(profile) {
  if (hasPermission(profile, 'can_access_dashboard')) return '/dashboard';
  return '/login';
}
