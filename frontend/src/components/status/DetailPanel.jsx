export function DetailPanel({ title, children, aside = null }) {
  return (
    <section className="ui-detail-panel">
      <div className="ui-detail-panel-head">
        <h3>{title}</h3>
        {aside}
      </div>
      <div className="ui-detail-panel-body">{children}</div>
    </section>
  );
}
