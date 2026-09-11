import { useNavigate } from 'react-router-dom';
import { Button } from '../forms/Button.jsx';

function ErrorIcon({ variant }) {
  if (variant === 'access') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="10" width="12" height="10" rx="2" />
        <path d="M8 10V8a4 4 0 0 1 8 0v2" />
      </svg>
    );
  }

  if (variant === 'not-found') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
        <path d="m8 8 4 4" />
        <path d="m12 8-4 4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4 3 20h18L12 4Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function ErrorState({
  title = 'Unable to load data',
  description = 'A connection timeout occurred while communicating with the active directory service. Please check your network and try again.',
  onRetry,
  onBack,
  actionLabel,
  variant = 'data',
}) {
  const navigate = useNavigate();
  const isAccess = variant === 'access';
  const primaryLabel = actionLabel || (isAccess ? 'Go Back' : 'Retry Connection');
  const handleAction = isAccess ? (onBack || (() => navigate(-1))) : onRetry;

  return (
    <section className={`ui-feedback ui-feedback-error ui-feedback-error-${variant}`} role="alert">
      <span className="ui-feedback-icon">
        <ErrorIcon variant={variant} />
      </span>
      <div className="ui-feedback-body">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {handleAction ? (
        <div className="ui-feedback-actions">
          <Button variant={isAccess ? 'secondary' : 'primary'} onClick={handleAction}>
            {primaryLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
