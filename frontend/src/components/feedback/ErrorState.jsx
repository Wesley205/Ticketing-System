import { useNavigate } from 'react-router-dom';
import { Button } from '../forms/Button.jsx';
import { AppIcon } from '../icons/AppIcon.jsx';

function ErrorIcon({ variant }) {
  if (variant === 'access') {
    return <AppIcon name="lock" size={22} />;
  }

  if (variant === 'not-found') {
    return <AppIcon name="search" size={22} />;
  }

  return <AppIcon name="alert" size={22} />;
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
  const isNotFound = variant === 'not-found';
  const primaryLabel = actionLabel || (isAccess ? 'Go Back' : isNotFound ? 'Go Back' : 'Retry');
  const handleAction = isAccess || isNotFound ? (onBack || (() => navigate(-1))) : onRetry;

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
          <Button variant={isAccess || isNotFound ? 'secondary' : 'primary'} onClick={handleAction}>
            <AppIcon name={isAccess || isNotFound ? 'previous' : 'refresh'} size={16} />
            {primaryLabel}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
