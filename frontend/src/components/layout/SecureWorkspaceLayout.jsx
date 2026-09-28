import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../forms/Button.jsx';
import { useAuth } from '../../features/auth/hooks/useAuth.js';
import { useNotificationCount } from '../../features/notifications/hooks/useNotificationCount.js';
import { canAccessRoute, getSecureWorkspaceLinks } from '../../permissions/access.js';

function linkPath(to = '') {
  return String(to).split('?')[0];
}

function NavIcon({ type }) {
  return <span className={`technician-dashboard-nav-icon technician-dashboard-nav-icon-${type}`} aria-hidden="true" />;
}

export function SecureWorkspaceLayout({
  children,
  title = 'NSC Secure Workspace',
  subtitle = 'ICT Secure Hub',
  links = null,
  activePath,
}) {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const notifications = useNotificationCount();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarProfile = {
    ...(auth.accessProfile || {}),
    role: auth.accessProfile?.role || auth.user?.role,
  };
  const visibleLinks = (links || getSecureWorkspaceLinks(sidebarProfile))
    .filter((link) => canAccessRoute(auth.accessProfile, linkPath(link.to)));

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  async function handleLogout() {
    setMobileNavOpen(false);
    await auth.logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className={`technician-dashboard-shell${mobileNavOpen ? ' mobile-nav-open' : ''}`}>
      <button
        type="button"
        className="technician-dashboard-sidebar-backdrop"
        aria-label="Close navigation menu"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside className="technician-dashboard-sidebar" id="secure-workspace-navigation">
        <div>
          <div className="technician-dashboard-brand">
            <span className="technician-dashboard-brand-mark">N</span>
            <div>
              <strong>NSC SECURE</strong>
              <small>{subtitle}</small>
            </div>
            <button
              type="button"
              className="technician-dashboard-nav-close"
              aria-label="Close navigation menu"
              onClick={() => setMobileNavOpen(false)}
            >
              ×
            </button>
          </div>

          <nav className="technician-dashboard-nav" aria-label="Secure workspace navigation">
            {visibleLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileNavOpen(false)}
                className={({ isActive }) =>
                  isActive || activePath === link.to || location.pathname === linkPath(link.to)
                    ? 'technician-dashboard-nav-link active'
                    : 'technician-dashboard-nav-link'
                }
              >
                <NavIcon type={link.icon} />
                <span>{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="technician-dashboard-session">
          <div className="technician-dashboard-avatar" aria-hidden="true">
            {(auth.user?.full_name || auth.user?.username || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <strong>{auth.user?.full_name || auth.user?.username || 'Authenticated user'}</strong>
            <small>{auth.accessProfile?.role_label || auth.user?.role || 'Active session'}</small>
          </div>
          <Button variant="ghost" size="sm" className="technician-dashboard-logout" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </aside>

      <div className="technician-dashboard-main">
        <header className="technician-dashboard-topbar">
          <div className="technician-dashboard-title-lockup">
            <button
              type="button"
              className="technician-dashboard-menu-button"
              aria-controls="secure-workspace-navigation"
              aria-expanded={mobileNavOpen}
              aria-label="Open navigation menu"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
            <span className="technician-dashboard-window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <h1>{title}</h1>
          </div>
          <div className="technician-dashboard-topbar-meta">
            <span className="technician-dashboard-secure-indicator" title={`${auth.accessProfile?.role_label || 'Secure'} connection active`}>
              <span className="technician-dashboard-secure-role">{auth.accessProfile?.role_label || 'Secure'}</span>
              <span className="technician-dashboard-secure-full"> connection active</span>
              <span className="technician-dashboard-secure-short"> active</span>
            </span>
            <Link
              to="/notifications"
              className={`technician-dashboard-notification-link${location.pathname === '/notifications' ? ' active' : ''}`}
              aria-label={`Open notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ''}`}
              title={notifications.unreadCount ? `${notifications.unreadCount} unread notification${notifications.unreadCount === 1 ? '' : 's'}` : 'No unread notifications'}
            >
              <span className="technician-dashboard-notification-icon" aria-hidden="true" />
              {notifications.unreadCount ? (
                <span className="technician-dashboard-notification-count" aria-hidden="true">
                  {notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}
                </span>
              ) : null}
            </Link>
            <span className="technician-dashboard-user-pill">
              <span aria-hidden="true" />
              {auth.user?.full_name || auth.user?.username || 'User'}
            </span>
          </div>
        </header>
        <main className="technician-dashboard-content">{children}</main>
      </div>
    </div>
  );
}
