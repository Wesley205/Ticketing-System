import { Link } from 'react-router-dom';
import { AppIcon } from '../icons/AppIcon.jsx';

function EmptyIcon({ variant }) {
  if (variant === 'search') {
    return <AppIcon name="search" size={22} />;
  }

  if (variant === 'assets') {
    return <AppIcon name="package" size={22} />;
  }

  return <AppIcon name="file" size={22} />;
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
