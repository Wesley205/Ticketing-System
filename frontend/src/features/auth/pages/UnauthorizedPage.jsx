import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';

export function UnauthorizedPage() {
  const location = useLocation();

  return (
    <div className="ui-stack-lg auth-guard-screen">
      <section className="react-panel">
        <p className="react-eyebrow">401</p>
        <h2 className="auth-card-title">Authentication required</h2>
        <p className="react-copy">
          You need an active session to continue.
        </p>
        {location.state?.from ? (
          <p className="react-copy">Requested route: {location.state.from}</p>
        ) : null}
        <div className="ui-inline-actions">
          <Link to="/login" state={{ from: location.state?.from || '/dashboard' }}>
            <Button>Go to login</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Stay on React login</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
