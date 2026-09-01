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
      <section className="auth-screen-hero">
        <p className="react-eyebrow">Invitation-only access</p>
        <h1>Activate your approved account.</h1>
        <p className="react-copy">
          Employees and approved temporary users must use an administrator-issued invitation.
        </p>
        <div className="ui-inline-actions">
          <span className="ui-chip">Controlled onboarding</span>
          <span className="ui-chip">Role-approved access</span>
          <span className="ui-chip">Lifecycle enforced</span>
        </div>
      </section>

      <section className="auth-screen-panel">
        <div className="auth-card-react">
          <div className="auth-card-brand">
            <span className="react-brand-mark">NSC</span>
            <div>
              <strong>NSC ICT Service Desk</strong>
              <small>Invitation activation</small>
            </div>
          </div>
          <div className="ui-stack-md">
            <div>
              <h2 className="auth-card-title">Accept invitation</h2>
              <p className="react-copy">
                Password rules and invitation validity remain enforced by the existing backend APIs.
              </p>
            </div>

            <InvitationForm
              onSubmit={handleSubmit}
              errorMessage={errorMessage}
              isSubmitting={isSubmitting}
              initialToken={initialToken}
            />

            <p className="auth-card-footer">
              Already have access? <Link to="/login">Return to sign in</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
