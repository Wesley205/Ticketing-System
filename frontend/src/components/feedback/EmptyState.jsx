import { Link } from 'react-router-dom';

function EmptyIcon({ variant }) {
  if (variant === 'search') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="10" cy="10" r="6" />
        <path d="m15 15 5 5" />
      </svg>
    );
  }

  if (variant === 'assets') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
        <path d="M4 7l8 4 8-4" />
        <path d="M12 11v10" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7V3Z" />
      <path d="M14 3v5h5" />
      <path d="M10 13h6" />
      <path d="M10 17h4" />
    </svg>
  );
}

function StateAction({ label, to, onClick, variant }) {
  if (!label) return null;
  const className = `ui-button ui-button-${variant} ui-button-sm`;

  if (to) {
    return (
      <Link className={className} to={to}>
        {label}
      </Link>
    );
  }

  return (
    <button className={className} type="button" onClick={onClick}>
      {label}
    </button>
  );
}

export function EmptyState({
  title = 'Nothing to show yet.',
  description = 'Try again after more records are available.',
  variant = 'generic',
  actionLabel = '',
  actionTo = '',
  onAction,
  secondaryActionLabel = '',
  secondaryActionTo = '',
  onSecondaryAction,
}) {
  return (
    <section className={`ui-feedback ui-feedback-empty ui-feedback-empty-${variant}`}>
      <span className="ui-feedback-icon">
        <EmptyIcon variant={variant} />
      </span>
      <div className="ui-feedback-body">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {actionLabel || secondaryActionLabel ? (
        <div className="ui-feedback-actions">
          <StateAction label={actionLabel} to={actionTo} onClick={onAction} variant="primary" />
          <StateAction label={secondaryActionLabel} to={secondaryActionTo} onClick={onSecondaryAction} variant="secondary" />
        </div>
      ) : null}
    </section>
  );
}
