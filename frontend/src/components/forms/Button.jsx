export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  loading = false,
  loadingLabel = 'Working...',
  disabled = false,
  ...props
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      className={`ui-button ui-button-${variant} ui-button-${size}${loading ? ' ui-button-loading' : ''} ${className}`.trim()}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <span className="ui-button-spinner" aria-hidden="true" /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  );
}
