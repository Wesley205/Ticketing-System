import { Button } from '../forms/Button.jsx';
import { useAuth } from '../../features/auth/hooks/useAuth.js';

export function Topbar({ title, subtitle, eyebrow = 'Incremental Migration' }) {
  const auth = useAuth();

  return (
    <header className="react-topbar">
      <div>
        <p className="react-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {subtitle ? <p className="react-subtitle">{subtitle}</p> : null}
      </div>
      <div className="react-topbar-actions">
        {auth.isAuthenticated ? (
          <div className="react-user-card">
            <div>
              <strong>{auth.user?.full_name || auth.user?.username || 'Authenticated user'}</strong>
              <small>{auth.accessProfile?.role_label || auth.user?.role || 'Active session'}</small>
            </div>
            <Button variant="secondary" size="sm" onClick={() => auth.logout()}>
              Log out
            </Button>
          </div>
        ) : null}
        <div className="react-status-card">
          <span className="react-status-dot" />
          <div>
            <strong>React frontend active</strong>
            <small>Production routes are served by the React application.</small>
          </div>
        </div>
      </div>
    </header>
  );
}
