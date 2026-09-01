const API_BASE = '/api';

const ROUTE_ACCESS = {
  dashboard: { href: '/dashboard.html', permission: 'can_access_dashboard' },
  assets: { href: '/assets.html', permission: 'can_access_assets' },
  'service-requests': { href: '/service-requests.html', permission: 'can_access_service_desk' },
  technician: { href: '/technician.html', permission: 'can_access_technician_portal' },
  maintenance: { href: '/maintenance.html', permission: 'can_manage_maintenance' },
  'knowledge-base': { href: '/knowledge-base.html', permission: 'can_access_knowledge_base' },
  staff: { href: '/staff.html', permission: 'can_access_staff_portal' },
  departments: { href: '/departments.html', permission: 'can_manage_departments' },
  reports: { href: '/reports.html', permission: 'can_view_reports' },
  'audit-log': { href: '/audit-log.html', permission: 'can_view_audit_logs' },
  about: { href: '/about.html', permission: null },
};

function getToken() {
  return localStorage.getItem('nsc_token');
}

function clearSession() {
  localStorage.removeItem('nsc_token');
  localStorage.removeItem('nsc_user');
}

function fallbackAccessProfile(user = {}) {
  const isAdmin = user.role === 'admin';
  const isIctOfficer = user.role === 'ict_officer';
  const isTechnician = user.role === 'technician';
  const canViewAllOperationalData = isAdmin || isIctOfficer;
  const departmentScope = !canViewAllOperationalData && !isTechnician && Boolean(user.department_id);
  const permissions = {
    can_view_all_operational_data: canViewAllOperationalData,
    can_manage_users: isAdmin,
    can_manage_departments: isAdmin,
    can_view_reports: canViewAllOperationalData,
    can_view_audit_logs: canViewAllOperationalData,
    can_create_invitation: isAdmin,
    can_view_technician_directory: canViewAllOperationalData,
    can_assign_service_request: canViewAllOperationalData,
    can_manage_service_request_assignments: canViewAllOperationalData,
    can_add_internal_ticket_note: canViewAllOperationalData || isTechnician,
    can_manage_assets: canViewAllOperationalData,
    can_manage_maintenance: canViewAllOperationalData || isTechnician,
    can_manage_knowledge_base: isAdmin || isIctOfficer,
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

  return {
    role: user.role || null,
    role_label: {
      admin: 'Administrator',
      ict_officer: 'ICT Officer',
      technician: 'Technician',
      staff: 'Staff/User',
    }[user.role] || user.role || 'User',
    user_type: user.user_type || null,
    department_id: user.department_id || null,
    permissions,
    scope: {
      organization_scope: canViewAllOperationalData,
      department_scope: departmentScope,
      assigned_only: isTechnician,
      user_only: !canViewAllOperationalData,
    },
    primary_portal: isAdmin
      ? 'administrator'
      : isIctOfficer
        ? 'ict_officer'
        : isTechnician
          ? 'technician'
          : departmentScope
            ? 'department_supervisor'
            : 'staff',
  };
}

function normalizeSessionUser(rawUser) {
  if (!rawUser) return null;
  return {
    ...rawUser,
    access_profile: rawUser.access_profile || fallbackAccessProfile(rawUser),
  };
}

function getUser() {
  const raw = localStorage.getItem('nsc_user');
  if (!raw) return null;
  try {
    return normalizeSessionUser(JSON.parse(raw));
  } catch (err) {
    clearSession();
    return null;
  }
}

function setSession(token, user) {
  localStorage.setItem('nsc_token', token);
  localStorage.setItem('nsc_user', JSON.stringify(normalizeSessionUser(user)));
}

function updateStoredUser(user) {
  const token = getToken();
  if (!token) return null;
  const normalized = normalizeSessionUser(user);
  localStorage.setItem('nsc_user', JSON.stringify(normalized));
  return normalized;
}

function getAccessProfile() {
  return getUser()?.access_profile || null;
}

function getPermissions() {
  return getAccessProfile()?.permissions || {};
}

function hasPermission(permissionKey) {
  if (!permissionKey) return true;
  return getPermissions()[permissionKey] === true;
}

function getHomeRoute() {
  const profile = getAccessProfile();
  if (!profile) return '/index.html';
  if (hasPermission('can_access_dashboard')) return '/dashboard.html';
  return '/index.html';
}

function canAccessRoute(routeKey) {
  const route = ROUTE_ACCESS[routeKey];
  return route ? hasPermission(route.permission) : false;
}

function redirectToHomePage() {
  window.location.href = getHomeRoute();
}

async function refreshSessionProfile() {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/index.html';
    throw new Error('Session expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to refresh session.');
  }

  return updateStoredUser(data);
}

async function ensureSessionProfile() {
  const token = getToken();
  if (!token) return null;
  const user = getUser();
  if (user?.access_profile?.permissions) return user;
  return refreshSessionProfile();
}

async function api(path, { method = 'GET', body, isCsv = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/index.html';
    throw new Error('Session expired');
  }

  if (isCsv) {
    if (!res.ok) throw new Error('Export failed');
    return res.blob();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

async function apiBlob(path, { method = 'GET' } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method, headers });
  if (res.status === 401) {
    clearSession();
    window.location.href = '/index.html';
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed');
  }
  return res.blob();
}

function requireAuthPage() {
  if (!getToken()) {
    window.location.href = '/index.html';
    return false;
  }
  return true;
}

function requireRolePage(...roles) {
  const user = getUser();
  if (!user || !roles.includes(user.role)) {
    redirectToHomePage();
    return false;
  }
  return true;
}

function requirePermissionPage(permissionKey) {
  if (!requireAuthPage()) return false;
  if (!hasPermission(permissionKey)) {
    redirectToHomePage();
    return false;
  }
  return true;
}

function requireRoutePage(routeKey) {
  if (!requireAuthPage()) return false;
  if (!canAccessRoute(routeKey)) {
    redirectToHomePage();
    return false;
  }
  return true;
}

function logout() {
  clearSession();
  window.location.href = '/index.html';
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function fmtDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  }[char]));
}

function statusClass(value) {
  return 'status-' + String(value).replace(/\s+/g, '-');
}

function renderPageState(kind, title, message, actionHtml = '') {
  return `
    <section class="page-state page-state-${kind}" aria-live="polite">
      <div class="page-state-inner">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(message)}</p>
        ${actionHtml}
      </div>
    </section>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ROUTE_ACCESS,
    fallbackAccessProfile,
    normalizeSessionUser,
    statusClass,
    escapeHtml,
  };
}
