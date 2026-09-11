import { Link } from 'react-router-dom';

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function ForbiddenPage() {
  return (
    <main className="auth-state-screen">
      <section className="auth-state-card auth-state-card-compact auth-state-card-forbidden" aria-labelledby="forbidden-title">
        <span className="auth-state-icon auth-state-icon-danger">
          <ShieldIcon />
        </span>
        <h1 id="forbidden-title">You don't have access to this page</h1>
        <p>You don't have the right permissions to view this page. Please sign in with the correct account or contact your administrator for help.</p>
        <div className="auth-state-actions">
          <Link className="auth-state-button auth-state-button-primary" to="/dashboard">
            Go to Dashboard
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
