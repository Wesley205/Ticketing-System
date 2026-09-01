export function FormSection({ title, description, children }) {
  return (
    <section className="ui-form-section">
      <div className="ui-form-section-head">
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="ui-form-section-body">{children}</div>
    </section>
  );
}
