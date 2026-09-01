import { humanizeStatus, statusClassName } from '../../lib/formatting.js';

export function StatusBadge({ value }) {
  return (
    <span className={`ui-badge ${statusClassName(value)}`.trim()}>
      {humanizeStatus(value)}
    </span>
  );
}
