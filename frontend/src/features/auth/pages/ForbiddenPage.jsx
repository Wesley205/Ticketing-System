import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';

export function ForbiddenPage() {
  const location = useLocation();

  return (
    <div className="ui-stack-lg auth-guard-screen">
      <section className="react-panel">
        <p className="react-eyebrow">403</p>
        <h2 className="auth-card-title">Access denied</h2>
        <p className="react-copy">
          Your account is signed in, but it does not currently have permission to open this React route.
        </p>
        {location.state?.from ? (
          <p className="react-copy">Requested route: {location.state.from}</p>
        ) : null}
        <div className="ui-inline-actions">
          <Link to="/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary">Return to dashboard</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
