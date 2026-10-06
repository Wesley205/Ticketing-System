import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { AppIcon } from '../../../components/icons/AppIcon.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';

const links = [
  { to: '/technician', label: 'Dashboard', icon: 'dashboard' },
  { to: '/technician/assigned-work', label: 'Assigned Work', icon: 'ticket' },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: 'book' },
  { to: '/assets', label: 'Assets', icon: 'asset' },
  { to: '/maintenance', label: 'Maintenance', icon: 'wrench' },
  { to: '/about', label: 'About', icon: 'info' },
];

function NavIcon({ type }) {
  return <AppIcon name={type} size={19} />;
}

export function TechnicianDashboardSidebar() {
  const auth = useAuth();
  const navigate = useNavigate();
  const assignedFloor = auth.user?.floor_label || null;

  async function handleLogout() {
    await auth.logout();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="technician-dashboard-sidebar">
      <div>
        <div className="technician-dashboard-brand">
          <span className="technician-dashboard-brand-mark">N</span>
          <div>
            <strong>NSC SECURE</strong>
            <small>ICT SERVICE HUB</small>
          </div>
        </div>

        <nav className="technician-dashboard-nav" aria-label="Technician navigation">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? 'technician-dashboard-nav-link active' : 'technician-dashboard-nav-link'
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
          {(auth.user?.full_name || auth.user?.username || 'T').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <strong>{auth.user?.full_name || auth.user?.username || 'Technician'}</strong>
          <small>{auth.accessProfile?.role_label || auth.user?.role || 'Technician'} / Level 3</small>
          <small>{assignedFloor ? `Assigned floor: ${assignedFloor}` : 'No floor assigned'}</small>
        </div>
        <Button variant="ghost" size="sm" className="technician-dashboard-logout" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </aside>
  );
}
