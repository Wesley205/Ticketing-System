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

const notificationUiState = {
  unreadCount: 0,
  notifications: [],
  preferences: null,
};

function renderNotificationList() {
  const target = document.getElementById('notification-list');
  const badge = document.getElementById('notification-badge');
  if (!target || !badge) return;

  badge.style.display = notificationUiState.unreadCount > 0 ? 'inline-flex' : 'none';
  badge.textContent = notificationUiState.unreadCount > 99 ? '99+' : String(notificationUiState.unreadCount || 0);

  target.innerHTML = notificationUiState.notifications.length
    ? notificationUiState.notifications.map((item) => `
      <div style="padding:10px 0;border-bottom:1px solid #e4e7ec;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-weight:600;color:#101828;">${escapeHtml(item.title)}</div>
            <div style="font-size:13px;color:#475467;margin-top:4px;">${escapeHtml(item.message)}</div>
            <div style="font-size:12px;color:#98a2b3;margin-top:6px;">${fmtDateTime(item.created_at)}</div>
          </div>
          ${item.is_read ? '' : `<button class="link-btn" onclick="markNotificationReadFromUi(${item.notification_id})">Read</button>`}
        </div>
      </div>
    `).join('')
    : '<div style="padding:12px 0;color:#667085;">No notifications yet.</div>';
}

async function loadNotificationsShell() {
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

function toggleNotificationMenu() {
  const menu = document.getElementById('notification-menu');
  if (!menu) return;
  const isOpen = menu.style.display === 'block';
  menu.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    loadNotificationsShell();
  }
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

function renderLayout(activeKey, pageTitle) {
  const user = getUser();
  if (!user) return;

  const allLinks = [
    { key: 'dashboard', href: '/dashboard.html', label: 'Dashboard', roles: ['admin', 'ict_officer', 'technician', 'staff'] },
    { key: 'assets', href: '/assets.html', label: 'Asset Management', roles: ['admin', 'ict_officer', 'technician', 'staff'] },
    { key: 'service-requests', href: '/service-requests.html', label: 'Service Desk', roles: ['admin', 'ict_officer', 'technician', 'staff'] },
    { key: 'technician', href: '/technician.html', label: 'My Assigned Requests', roles: ['technician'] },
    { key: 'maintenance', href: '/maintenance.html', label: 'Maintenance', roles: ['admin', 'ict_officer', 'technician'] },
    { key: 'staff', href: '/staff.html', label: 'Staff Management', roles: ['admin', 'ict_officer'] },
    { key: 'departments', href: '/departments.html', label: 'Departments', roles: ['admin', 'ict_officer'] },
    { key: 'reports', href: '/reports.html', label: 'Reports', roles: ['admin', 'ict_officer'] },
    { key: 'audit-log', href: '/audit-log.html', label: 'Audit Log', roles: ['admin', 'ict_officer'] },
    { key: 'about', href: '/about.html', label: 'About the System', roles: ['admin', 'ict_officer', 'technician', 'staff'] },
  ];

  const links = allLinks.filter((link) => link.roles.includes(user.role));
  const navHtml = links.map((link) =>
    `<a href="${link.href}" class="${link.key === activeKey ? 'active' : ''}">${NAV_ICONS[link.key] || ''}<span>${link.label}</span></a>`
  ).join('');

  const roleLabel = {
    admin: 'Administrator',
    ict_officer: 'ICT Officer',
    technician: 'Technician',
    staff: 'Staff',
  }[user.role] || user.role;

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
        <div class="user-info" style="display:flex;align-items:center;gap:12px;position:relative;">
          <div style="position:relative;">
            <button class="btn secondary small" onclick="toggleNotificationMenu()" style="position:relative;">
              Notifications
              <span id="notification-badge" style="display:none;position:absolute;top:-8px;right:-8px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#c0362c;color:#fff;font-size:11px;align-items:center;justify-content:center;"></span>
            </button>
            <div id="notification-menu" style="display:none;position:absolute;right:0;top:42px;width:360px;background:#fff;border:1px solid #e4e7ec;border-radius:14px;box-shadow:0 16px 40px rgba(16,24,40,.16);padding:14px;z-index:50;">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px;">
                <strong>Notifications</strong>
                <div style="display:flex;gap:8px;">
                  <button class="link-btn" onclick="markAllNotificationsReadFromUi()">Read all</button>
                  <button class="link-btn" onclick="openNotificationPreferences()">Preferences</button>
                </div>
              </div>
              <div id="notification-list"></div>
            </div>
          </div>
          <span>${escapeHtml(user.full_name)}</span>
          <button class="btn secondary small" onclick="logout()">Log out</button>
        </div>
      </div>
      <div class="content" id="page-content"></div>
    </div>
    <div id="notification-pref-modal" style="display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);align-items:center;justify-content:center;z-index:60;">
      <div style="width:min(92vw,520px);background:#fff;border-radius:16px;padding:20px;box-shadow:0 20px 50px rgba(16,24,40,.22);">
        <h3 style="margin:0 0 12px;">Notification Preferences</h3>
        <div style="display:grid;gap:10px;font-size:14px;color:#344054;">
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

  setTimeout(() => {
    loadNotificationsShell();
    document.addEventListener('click', (event) => {
      const menu = document.getElementById('notification-menu');
      const badge = document.getElementById('notification-badge');
      if (!menu || !badge) return;
      if (menu.style.display === 'block' && !menu.contains(event.target) && event.target !== badge && !String(event.target.className).includes('btn')) {
        menu.style.display = 'none';
      }
    }, { once: true });
  }, 0);
}
