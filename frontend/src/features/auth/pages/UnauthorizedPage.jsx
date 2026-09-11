import { Link, useLocation } from 'react-router-dom';

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function UnauthorizedPage() {
  const location = useLocation();

  return (
    <main className="auth-state-screen">
      <section className="auth-state-card auth-state-card-compact auth-state-card-forbidden" aria-labelledby="unauthorized-title">
        <span className="auth-state-icon auth-state-icon-danger">
          <ShieldIcon />
        </span>
        <h1 id="unauthorized-title">You don't have access to this page</h1>
        <p>You need an active session to continue. Please sign in with the correct account or contact your administrator for help.</p>
        <div className="auth-state-actions">
          <Link className="auth-state-button auth-state-button-primary" to="/login" state={{ from: location.state?.from || '/dashboard' }}>
            Sign In
          </Link>
          <div className="auth-state-links">
            <Link to="/help">Get Help</Link>
            <span aria-hidden="true">&bull;</span>
            <Link to="/help">Contact Admin</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
