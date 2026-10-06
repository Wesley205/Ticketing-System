import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth.js';
import { canAccessRoute } from '../../permissions/access.js';

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/foundation', label: 'Foundation' },
  { to: '/service-requests', label: 'Service Desk' },
  { to: '/technician', label: 'Technician' },
  { to: '/assets', label: 'Assets' },
  { to: '/maintenance', label: 'Maintenance' },
  { to: '/staff', label: 'Staff' },
  { to: '/departments', label: 'Departments' },
  { to: '/knowledge-base', label: 'Knowledge Base' },
  { to: '/reports', label: 'Reports' },
  { to: '/audit-logs', label: 'Audit Logs' },
  { to: '/about', label: 'About' },
];

export function Sidebar() {
  const auth = useAuth();
  const visibleLinks = links.filter((link) => {
    if (link.to === '/foundation' || link.to === '/about') return true;
    return canAccessRoute(auth.accessProfile, link.to);
  });

  return (
    <aside className="react-sidebar">
      <div className="react-brand">
        <span className="react-brand-mark">NSC</span>
        <div>
          <strong>ICT Service Desk</strong>
          <small>Secure workspace</small>
        </div>
      </div>
      <nav className="react-nav">
        {visibleLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              isActive ? 'react-nav-link active' : 'react-nav-link'
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
