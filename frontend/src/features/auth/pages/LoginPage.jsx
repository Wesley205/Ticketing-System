import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { getDefaultAuthenticatedRoute } from '../../../permissions/access.js';
import { useAuth } from '../hooks/useAuth.js';
import { LoginForm } from '../components/LoginForm.jsx';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnTo = location.state?.from || getDefaultAuthenticatedRoute(auth.accessProfile);
  const routeMessage =
    location.state?.reason === 'unauthenticated'
      ? 'Sign in to continue to the requested page.'
      : '';

  async function handleSubmit(credentials) {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await auth.login(credentials);
      navigate(returnTo, { replace: true });
    } catch (error) {
      const normalized = normalizeApiError(error, 'Unable to sign in.');
      setErrorMessage(normalized.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-screen-hero">
        <p className="react-eyebrow">System Status: Operational</p>
        <h1>Every asset tracked. Every ticket accounted for.</h1>
        <p className="react-copy">
          The ICT department&apos;s console for hardware, maintenance, and support requests.
        </p>
        <div className="ui-inline-actions">
          <span className="ui-chip">4 role tiers</span>
          <span className="ui-chip">Invitation-only access</span>
          <span className="ui-chip">Audit-aware sessions</span>
        </div>
      </section>

      <section className="auth-screen-panel">
        <div className="auth-card-react">
          <div className="auth-card-brand">
            <span className="react-brand-mark">NSC</span>
            <div>
              <strong>NSC ICT Service Desk</strong>
              <small>React authentication flow</small>
            </div>
          </div>
          <div className="ui-stack-md">
            <div>
              <h2 className="auth-card-title">Sign in to your account</h2>
              <p className="react-copy">
                Access is invitation-only. Contact an administrator if you need an approved account or activation link.
              </p>
            </div>

            {routeMessage ? <ErrorState title="Authentication required" description={routeMessage} /> : null}

            <LoginForm
              onSubmit={handleSubmit}
              errorMessage={errorMessage}
              isSubmitting={isSubmitting}
            />

            <p className="auth-card-footer">
              Need to activate an invitation? <Link to="/activate">Use the activation form</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
