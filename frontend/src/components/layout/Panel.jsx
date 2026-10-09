import { useId } from 'react';

export function Panel({ title, actions = null, children, ariaLabel }) {
  const titleId = useId();

  return (
    <section className="react-panel" aria-labelledby={title ? titleId : undefined} aria-label={!title ? ariaLabel : undefined}>
      {(title || actions) ? (
        <div className="ui-panel-head">
          {title ? <h3 id={titleId}>{title}</h3> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
