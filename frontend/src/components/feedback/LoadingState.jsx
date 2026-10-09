function TableSkeleton({ rows = 6 }) {
  return (
    <div className="ui-skeleton-table" aria-hidden="true">
      <div className="ui-skeleton-row ui-skeleton-row-head">
        <span />
        <span />
        <span />
        <span />
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div className="ui-skeleton-row" key={index}>
          <i />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="ui-skeleton-detail" aria-hidden="true">
      <i />
      <div>
        <span />
        <span />
      </div>
      <span />
      <span />
      <span />
      <b />
    </div>
  );
}

function Spinner() {
  return (
    <span className="ui-feedback-spinner" aria-hidden="true">
      <span />
    </span>
  );
}

export function LoadingState({
  title = 'Loading...',
  description = 'Please wait while this loads.',
  variant = 'default',
  rows = 6,
  ariaLabel = 'Loading content',
}) {
  const isTable = variant === 'table';
  const isDetail = variant === 'detail';
  const isOverlay = variant === 'overlay';

  return (
    <section className={`ui-feedback ui-feedback-loading ui-feedback-${variant}`} role="status" aria-live="polite" aria-busy="true" aria-label={ariaLabel}>
      {isTable ? <TableSkeleton rows={rows} /> : null}
      {isDetail ? <DetailSkeleton /> : null}
      {isOverlay ? <Spinner /> : null}
      {!isTable && !isDetail && !isOverlay ? <div className="ui-feedback-pulse" aria-hidden="true" /> : null}
      <h3>{title}</h3>
      <p>{description}</p>
    </section>
  );
}
