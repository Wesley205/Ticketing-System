import { useNavigate } from 'react-router-dom';

function SearchMissingIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="10" r="6" />
      <path d="m15 15 5 5" />
      <path d="m8 8 4 4" />
      <path d="m12 8-4 4" />
    </svg>
  );
}

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="auth-state-screen">
      <section className="auth-state-card auth-state-card-compact" aria-labelledby="not-found-title">
        <span className="auth-state-icon auth-state-icon-neutral">
          <SearchMissingIcon />
        </span>
        <h1 id="not-found-title">Page not found</h1>
        <p>The page you're looking for doesn't exist or may have been moved.</p>
        <p>Verify the destination address or trace back your navigation.</p>
        <div className="auth-state-actions">
          <button className="auth-state-button auth-state-button-primary" type="button" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
          <button className="auth-state-button auth-state-button-secondary" type="button" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </section>
    </main>
  );
}
