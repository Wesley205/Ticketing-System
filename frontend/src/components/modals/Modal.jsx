import { AppIcon } from '../icons/AppIcon.jsx';

export function Modal({
  open,
  title,
  children,
  onClose,
  footer = null,
  className = '',
}) {
  if (!open) return null;

  return (
    <div className="ui-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className={`ui-modal ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="ui-modal-head">
          <h3>{title}</h3>
          <button type="button" className="ui-icon-button" onClick={onClose} aria-label="Close dialog" title="Close">
            <AppIcon name="close" size={20} />
          </button>
        </div>
        <div className="ui-modal-body">{children}</div>
        {footer ? <div className="ui-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
