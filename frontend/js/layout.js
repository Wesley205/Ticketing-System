// Builds the sidebar + topbar shell on every authenticated page.
// Usage: renderLayout('dashboard', 'Dashboard');

const NAV_ICONS = {
  dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  assets: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="12" rx="1"/><path d="M8 21h8M12 16v5"/></svg>',
  'service-requests': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 13h6M9 17h4"/></svg>',
  technician: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  maintenance: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  staff: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  departments: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1"/></svg>',
  reports: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/></svg>',
  'audit-log': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><circle cx="12" cy="14" r="2"/><path d="M12 12v-.01"/></svg>',
  about: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
};

function renderLayout(activeKey, pageTitle) {
  const user = getUser();
  if (!user) return;

  const allLinks = [
    { key: 'dashboard', href: '/dashboard.html', label: 'Dashboard', roles: ['admin','ict_officer','technician','staff'] },
    { key: 'assets', href: '/assets.html', label: 'Asset Management', roles: ['admin','ict_officer','technician','staff'] },
    { key: 'service-requests', href: '/service-requests.html', label: 'Service Desk', roles: ['admin','ict_officer','technician','staff'] },
    { key: 'technician', href: '/technician.html', label: 'My Assigned Requests', roles: ['technician'] },
    { key: 'maintenance', href: '/maintenance.html', label: 'Maintenance', roles: ['admin','ict_officer','technician'] },
    { key: 'staff', href: '/staff.html', label: 'Staff Management', roles: ['admin','ict_officer'] },
    { key: 'departments', href: '/departments.html', label: 'Departments', roles: ['admin','ict_officer'] },
    { key: 'reports', href: '/reports.html', label: 'Reports', roles: ['admin','ict_officer'] },
    { key: 'audit-log', href: '/audit-log.html', label: 'Audit Log', roles: ['admin','ict_officer'] },
    { key: 'about', href: '/about.html', label: 'About the System', roles: ['admin','ict_officer','technician','staff'] },
  ];

  const links = allLinks.filter(l => l.roles.includes(user.role));
  const navHtml = links.map(l =>
    `<a href="${l.href}" class="${l.key === activeKey ? 'active' : ''}">${NAV_ICONS[l.key] || ''}<span>${l.label}</span></a>`
  ).join('');

  const roleLabel = { admin: 'Administrator', ict_officer: 'ICT Officer', technician: 'Technician', staff: 'Staff' }[user.role] || user.role;

  document.getElementById('app-shell').innerHTML = `
    <aside class="sidebar" id="sidebar">
      <div class="brand"><img src="/img/logo.svg" alt="" class="brand-logo"><span>NSC ICT Service Desk
        <small>ASSET MANAGEMENT SYSTEM</small></span>
      </div>
      <nav>${navHtml}</nav>
      <div class="role-badge">${roleLabel}</div>
    </aside>
    <div class="main">
      <div class="topbar">
        <h2>${pageTitle}</h2>
        <div class="user-info">
          <span>${escapeHtml(user.full_name)}</span>
          <button class="btn secondary small" onclick="logout()">Log out</button>
        </div>
      </div>
      <div class="content" id="page-content"></div>
    </div>
  `;
}
