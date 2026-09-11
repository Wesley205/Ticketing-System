import { useAuth } from '../../auth/hooks/useAuth.js';

export function TechnicianDashboardTopbar() {
  const auth = useAuth();

  return (
    <header className="technician-dashboard-topbar">
      <div className="technician-dashboard-title-lockup">
        <span className="technician-dashboard-help-mark">?</span>
        <h1>Technician Dashboard</h1>
      </div>
      <div className="technician-dashboard-topbar-meta">
        <span className="technician-dashboard-secure-indicator">Secure endpoint active</span>
        <span className="technician-dashboard-notification" aria-label="3 notifications">3</span>
        <span className="technician-dashboard-user-pill">
          <span aria-hidden="true" />
          {auth.user?.full_name || auth.user?.username || 'Technician'}
        </span>
      </div>
    </header>
  );
}
