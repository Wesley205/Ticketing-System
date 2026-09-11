import { Link } from 'react-router-dom';

export function SecureDashboardMetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
  actionLabel,
  to,
}) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
      {actionLabel ? <b>{actionLabel}</b> : null}
    </>
  );

  if (to) {
    return <Link className={`secure-dashboard-card secure-dashboard-card-${tone}`} to={to}>{content}</Link>;
  }

  return <article className={`secure-dashboard-card secure-dashboard-card-${tone}`}>{content}</article>;
}

export function SecureDashboardActionCard({ title, description, actionLabel, to, tone = 'neutral' }) {
  return (
    <Link className={`secure-dashboard-action-card secure-dashboard-card-${tone}`} to={to}>
      <span aria-hidden="true">+</span>
      <strong>{title}</strong>
      <small>{description}</small>
      <b>{actionLabel}</b>
    </Link>
  );
}
