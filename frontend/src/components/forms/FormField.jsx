export function FormField({ label, hint, error, htmlFor, children }) {
  return (
    <label className="ui-field" htmlFor={htmlFor}>
      <span className="ui-field-label">{label}</span>
      {children}
      {hint ? <span className="ui-field-hint">{hint}</span> : null}
      {error ? <span className="ui-field-error">{error}</span> : null}
    </label>
  );
}
