import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeApiError } from '../../../lib/error-handling.js';
import { useAuth } from '../hooks/useAuth.js';
import { InvitationForm } from '../components/InvitationForm.jsx';

export function ActivationPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialToken = useMemo(() => searchParams.get('token') || '', [searchParams]);

  async function handleSubmit(payload) {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await auth.activate(payload);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const normalized = normalizeApiError(error, 'Unable to activate this invitation.');
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
            <span>NSC ICT</span>
          </div>
          <div className="auth-brand-copy">
            <h1>Invitation Activation</h1>
            <p>Activate your official NSC account using your administrative token.</p>
          </div>
          <div className="auth-security-meta" aria-label="Security classification">
            <span>Gateway Secure</span>
            <span>Level 4 Security Req</span>
          </div>
        </section>

        <section className="auth-form-panel">
          <div className="auth-card-react">
            <div className="auth-form-heading">
              <h2 className="auth-card-title">Activate Invitation</h2>
              <p>Create your account credentials from an administrator-issued activation link.</p>
            </div>
            <InvitationForm
              onSubmit={handleSubmit}
              errorMessage={errorMessage}
              isSubmitting={isSubmitting}
              initialToken={initialToken}
            />

            <div className="auth-card-footer">
              <p>
                Already have access? <Link to="/login">Return to sign in</Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
