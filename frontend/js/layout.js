const NAV_ICONS = {
  dashboard: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
  assets: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="12" rx="1"/><path d="M8 21h8M12 16v5"/></svg>',
  'service-requests': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="M9 13h6M9 17h4"/></svg>',
  technician: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  maintenance: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  'knowledge-base': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
  staff: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  departments: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1m4 0h1m-6 4h1m4 0h1m-6 4h1m4 0h1"/></svg>',
  reports: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/></svg>',
  'audit-log': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><circle cx="12" cy="14" r="2"/><path d="M12 12v-.01"/></svg>',
  about: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
};

const notificationUiState = {
  unreadCount: 0,
  notifications: [],
  preferences: null,
};

function getPortalLabel(profile) {
  return {
    administrator: 'Administrator Portal',
    ict_officer: 'ICT Operations Portal',
    technician: 'Technician Portal',
    department_supervisor: 'Department Portal',
    staff: 'Staff Portal',
  }[profile?.primary_portal] || 'Workspace';
}

function getScopeSummary(profile) {
  if (!profile?.scope) return 'Session scope unavailable.';
  if (profile.scope.organization_scope) return 'Organization-wide operational scope';
  if (profile.scope.assigned_only) return 'Assigned tickets and technician workload';
  if (profile.scope.department_scope) return 'Department-scoped visibility';
  if (profile.scope.user_only) return 'Self-service visibility';
  return 'Scoped access';
}

function getNavigationModel() {
  return [
    {
      label: 'Work',
      links: [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'service-requests', label: 'Service Desk' },
        { key: 'technician', label: 'My Assigned Requests' },
        { key: 'assets', label: 'Asset Management' },
        { key: 'maintenance', label: 'Maintenance' },
        { key: 'knowledge-base', label: 'Knowledge Base' },
      ],
    },
    {
      label: 'Oversight',
      links: [
        { key: 'staff', label: 'Staff Management' },
        { key: 'departments', label: 'Departments' },
        { key: 'reports', label: 'Reports' },
        { key: 'audit-log', label: 'Audit Log' },
      ],
    },
    {
      label: 'Support',
      links: [
        { key: 'about', label: 'About the System' },
      ],
    },
  ];
}

function renderNotificationList() {
  const target = document.getElementById('notification-list');
  const badge = document.getElementById('notification-badge');
  if (!target || !badge) return;

  badge.style.display = notificationUiState.unreadCount > 0 ? 'inline-flex' : 'none';
  badge.textContent = notificationUiState.unreadCount > 99 ? '99+' : String(notificationUiState.unreadCount || 0);

  target.innerHTML = notificationUiState.notifications.length
    ? notificationUiState.notifications.map((item) => `
      <div class="notification-item">
        <div class="notification-item-head">
          <div>
            <div class="notification-title">${escapeHtml(item.title)}</div>
            <div class="notification-copy">${escapeHtml(item.message)}</div>
            <div class="notification-time">${fmtDateTime(item.created_at)}</div>
          </div>
          ${item.is_read ? '' : `<button class="link-btn" onclick="markNotificationReadFromUi(${item.notification_id})">Read</button>`}
        </div>
      </div>
    `).join('')
    : '<div class="notification-empty">No notifications yet.</div>';
}

async function loadNotificationsShell() {
  if (!hasPermission('can_access_notifications')) return;
  try {
    const [countResult, notifications] = await Promise.all([
      api('/notifications/unread-count'),
      api('/notifications?limit=8'),
    ]);
    notificationUiState.unreadCount = Number(countResult.unread_count || 0);
    notificationUiState.notifications = notifications;
    renderNotificationList();
  } catch (err) {
    console.warn('Failed to load notifications:', err.message);
  }
}

function closeNotificationMenu() {
  const menu = document.getElementById('notification-menu');
  if (menu) menu.style.display = 'none';
}

function toggleNotificationMenu() {
  const menu = document.getElementById('notification-menu');
  if (!menu) return;
  const isOpen = menu.style.display === 'block';
  menu.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) loadNotificationsShell();
}

async function markNotificationReadFromUi(notificationId) {
  try {
    await api(`/notifications/${notificationId}/read`, { method: 'POST' });
    await loadNotificationsShell();
  } catch (err) {
    alert(err.message);
  }
}

async function markAllNotificationsReadFromUi() {
  try {
    await api('/notifications/read-all', { method: 'POST' });
    await loadNotificationsShell();
  } catch (err) {
    alert(err.message);
  }
}

async function openNotificationPreferences() {
  try {
    notificationUiState.preferences = await api('/notifications/preferences/me');
    const prefs = notificationUiState.preferences;
    const fields = [
      'in_app_enabled',
      'email_enabled',
      'assignment_enabled',
      'status_change_enabled',
      'maintenance_enabled',
      'comment_enabled',
      'attachment_enabled',
      'sla_enabled',
      'system_enabled',
    ];
    for (const field of fields) {
      const input = document.getElementById(`pref_${field}`);
      if (input) input.checked = prefs[field] !== false;
    }
    document.getElementById('notification-pref-modal').style.display = 'flex';
  } catch (err) {
    alert(err.message);
  }
}

function closeNotificationPreferences() {
  const modal = document.getElementById('notification-pref-modal');
  if (modal) modal.style.display = 'none';
}

async function saveNotificationPreferences() {
  const body = {};
  const fields = [
    'in_app_enabled',
    'email_enabled',
    'assignment_enabled',
    'status_change_enabled',
    'maintenance_enabled',
    'comment_enabled',
    'attachment_enabled',
    'sla_enabled',
    'system_enabled',
  ];

  for (const field of fields) {
    const input = document.getElementById(`pref_${field}`);
    if (input) body[field] = input.checked;
  }

  try {
    await api('/notifications/preferences/me', { method: 'PATCH', body });
    closeNotificationPreferences();
  } catch (err) {
    alert(err.message);
  }
}

function toggleSidebar(forceOpen) {
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!sidebar || !backdrop) return;
  const open = typeof forceOpen === 'boolean' ? forceOpen : !sidebar.classList.contains('open');
  sidebar.classList.toggle('open', open);
  backdrop.classList.toggle('open', open);
}

function renderNavSections(activeKey) {
  return getNavigationModel().map((section) => {
    const visibleLinks = section.links.filter((link) => canAccessRoute(link.key));
    if (!visibleLinks.length) return '';
    return `
      <div class="nav-section">
        <div class="nav-section-label">${section.label}</div>
        ${visibleLinks.map((link) => `
          <a href="${ROUTE_ACCESS[link.key].href}" class="${link.key === activeKey ? 'active' : ''}">
            ${NAV_ICONS[link.key] || ''}
            <span>${link.label}</span>
          </a>
        `).join('')}
      </div>
    `;
  }).join('');
}

function renderLayout(activeKey, pageTitle, pageSubtitle = '') {
  const user = getUser();
  const profile = getAccessProfile();
  if (!user || !profile) return;

  const shell = document.getElementById('app-shell');
  if (!shell) return;

  shell.innerHTML = `
    <div id="sidebar-backdrop" class="sidebar-backdrop" onclick="toggleSidebar(false)"></div>
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <img src="/img/logo.svg" alt="" class="brand-logo">
        <span>NSC ICT Service Desk
          <small>ASSET MANAGEMENT SYSTEM</small>
        </span>
      </div>
      <div class="sidebar-context">
        <div class="role-badge">${escapeHtml(profile.role_label)}</div>
        <div class="portal-badge">${escapeHtml(getPortalLabel(profile))}</div>
        <div class="scope-copy">${escapeHtml(getScopeSummary(profile))}</div>
      </div>
      <nav>${renderNavSections(activeKey)}</nav>
    </aside>
    <div class="main">
      <div class="topbar">
        <div class="topbar-heading">
          <button class="sidebar-toggle" type="button" onclick="toggleSidebar(true)" aria-label="Open navigation">☰</button>
          <div>
            <h2>${escapeHtml(pageTitle)}</h2>
            ${pageSubtitle ? `<div class="topbar-subtitle">${escapeHtml(pageSubtitle)}</div>` : ''}
          </div>
        </div>
        <div class="user-info">
          <div class="user-identity">
            <strong>${escapeHtml(user.full_name)}</strong>
            <span>${escapeHtml(profile.role_label)}</span>
          </div>
          <div class="notification-shell">
            <button class="btn secondary small" onclick="toggleNotificationMenu()" style="position:relative;">
              Notifications
              <span id="notification-badge" class="notification-badge"></span>
            </button>
            <div id="notification-menu" class="notification-menu">
              <div class="notification-menu-head">
                <strong>Notifications</strong>
                <div class="notification-actions">
                  <button class="link-btn" onclick="markAllNotificationsReadFromUi()">Read all</button>
                  <button class="link-btn" onclick="openNotificationPreferences()">Preferences</button>
                </div>
              </div>
              <div id="notification-list"></div>
            </div>
          </div>
          <button class="btn secondary small" onclick="logout()">Log out</button>
        </div>
      </div>
      <div class="content" id="page-content"></div>
    </div>
    <div id="notification-pref-modal" class="notification-pref-modal">
      <div class="notification-pref-card">
        <h3>Notification Preferences</h3>
        <div class="notification-pref-grid">
          <label><input id="pref_in_app_enabled" type="checkbox"> Enable in-app notifications</label>
          <label><input id="pref_email_enabled" type="checkbox"> Enable email notifications when delivery is configured</label>
          <label><input id="pref_assignment_enabled" type="checkbox"> Ticket assignment updates</label>
          <label><input id="pref_status_change_enabled" type="checkbox"> Ticket status changes</label>
          <label><input id="pref_comment_enabled" type="checkbox"> Ticket comments</label>
          <label><input id="pref_attachment_enabled" type="checkbox"> Ticket attachments</label>
          <label><input id="pref_sla_enabled" type="checkbox"> SLA and escalation alerts</label>
          <label><input id="pref_maintenance_enabled" type="checkbox"> Maintenance updates</label>
          <label><input id="pref_system_enabled" type="checkbox"> System and account notices</label>
        </div>
        <div class="modal-actions" style="margin-top:18px;">
          <button type="button" class="btn secondary" onclick="closeNotificationPreferences()">Cancel</button>
          <button type="button" class="btn" onclick="saveNotificationPreferences()">Save Preferences</button>
        </div>
      </div>
    </div>
  `;

  loadNotificationsShell();

  document.addEventListener('click', (event) => {
    const menu = document.getElementById('notification-menu');
    const trigger = document.querySelector('.notification-shell .btn');
    if (!menu || !trigger) return;
    if (menu.style.display === 'block' && !menu.contains(event.target) && !trigger.contains(event.target)) {
      closeNotificationMenu();
    }
  });
}
