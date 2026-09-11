import { Link } from 'react-router-dom';

function HelpIcon({ type }) {
  if (type === 'mail') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16v12H4z" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    );
  }

  if (type === 'clock') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 7v5l3 2" />
        <path d="M5 5 3 7" />
        <path d="m19 5 2 2" />
        <path d="M7 21h10" />
        <circle cx="12" cy="13" r="7" />
      </svg>
    );
  }

  if (type === 'phone') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3h4l2 5-3 2c1 3 3 5 6 6l2-3 5 2v4c0 1-1 2-2 2A17 17 0 0 1 3 4c0-1 1-1 3-1z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 13c3 0 5 2 5 5v1H7v-1c0-3 2-5 5-5z" />
      <circle cx="12" cy="8" r="3" />
    </svg>
  );
}

function HelpOption({ icon, title, description }) {
  return (
    <article className="auth-help-option">
      <span className="auth-help-icon">
        <HelpIcon type={icon} />
      </span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </article>
  );
}

export function AccountHelpPage() {
  return (
    <main className="auth-state-screen">
      <section className="auth-help-card" aria-labelledby="account-help-title">
        <header className="auth-help-header">
          <h1 id="account-help-title">Need help with your account?</h1>
          <p>Choose an option below, or contact ICT support directly.</p>
        </header>

        <div className="auth-help-divider" />

        <div className="auth-help-options">
          <HelpOption
            icon="user"
            title="Can't sign in?"
            description="Contact your ICT admin. Automated resets are disabled for security."
          />
          <HelpOption
            icon="mail"
            title="Invitation problems?"
            description="Links expire in 72 hours. Ask your unit commander to request a new token."
          />
          <HelpOption
            icon="clock"
            title="Account expired?"
            description="Temporary accounts end on the set date. Ask your sponsor to request an extension."
          />
        </div>

        <div className="auth-help-divider" />

        <section className="auth-support-card" aria-label="ICT support contact">
          <h2>ICT Support Service Desk</h2>
          <p>
            <HelpIcon type="mail" />
            <span>EMAIL: ict.support@nsc.gov</span>
          </p>
          <p>
            <HelpIcon type="phone" />
            <span>PHONE: +1 (555) 010-HELP</span>
          </p>
        </section>

        <footer className="auth-help-footer">
          <p>Automated password reset is not currently available.</p>
          <Link className="auth-state-button auth-state-button-secondary" to="/login">
            <span aria-hidden="true">&larr;</span>
            Return to Sign In
          </Link>
        </footer>
      </section>
    </main>
  );
}
