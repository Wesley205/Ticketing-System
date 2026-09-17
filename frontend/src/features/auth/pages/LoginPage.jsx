import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { buildAccessProfile, getDefaultAuthenticatedRoute, normalizeAccessProfile } from '../../../permissions/access.js';
import { useAuth } from '../hooks/useAuth.js';
import { LoginForm } from '../components/LoginForm.jsx';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(credentials) {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const session = await auth.login(credentials);
      const accessProfile = normalizeAccessProfile(
        session.user?.access_profile || buildAccessProfile(session.user),
        session.user
      );
      const returnTo = location.state?.from || getDefaultAuthenticatedRoute(accessProfile);
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
      <div className="auth-layout-card">
        <section className="auth-brand-panel" aria-label="NSC ICT secure access gateway">
          <div className="auth-brand-grid" aria-hidden="true" />
          <div className="auth-logo-lockup">
            <span className="auth-logo-mark">N</span>
            <span>NSC Secure</span>
          </div>
          <div className="auth-brand-copy">
            <h1>ICT Service Hub</h1>
            <p>Secure access for ticketing, assets, maintenance, and operational support.</p>
          </div>
          <div className="auth-security-meta" aria-label="Security classification">
            <span>Secure Endpoint</span>
            <span>Internal Access Only</span>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card-react">
            <div className="auth-form-heading">
              <h2 className="auth-card-title">Sign In</h2>
              <p>Enter your credentials to access the ICT ticketing system.</p>
            </div>
            <LoginForm
              onSubmit={handleSubmit}
              errorMessage={errorMessage}
              isSubmitting={isSubmitting}
            />

            <div className="auth-card-footer">
              <p>
                Need access? <Link to="/help">Contact your ICT administrator</Link>
              </p>
              <Link to="/activate">Activate an invitation</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
