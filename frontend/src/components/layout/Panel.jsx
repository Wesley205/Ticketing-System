export function Panel({ title, actions = null, children }) {
  return (
    <section className="react-panel">
      {(title || actions) ? (
        <div className="ui-panel-head">
          {title ? <h3>{title}</h3> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
