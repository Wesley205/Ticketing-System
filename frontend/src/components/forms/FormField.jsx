import { Children, cloneElement, isValidElement } from 'react';

export function FormField({ label, hint, error, htmlFor, children }) {
  const hintId = hint && htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  const field = Children.map(children, (child) => (
    isValidElement(child) && describedBy
      ? cloneElement(child, {
        'aria-describedby': [child.props['aria-describedby'], describedBy].filter(Boolean).join(' '),
        'aria-invalid': error ? true : child.props['aria-invalid'],
      })
      : child
  ));

  return (
    <label className="ui-field" htmlFor={htmlFor}>
      <span className="ui-field-label">{label}</span>
      {field}
      {hint ? <span id={hintId} className="ui-field-hint">{hint}</span> : null}
      {error ? <span id={errorId} className="ui-field-error" role="alert">{error}</span> : null}
    </label>
  );
}
