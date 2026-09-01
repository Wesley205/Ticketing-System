export function PriorityBadge({ value = 'Medium' }) {
  const normalized = String(value || 'Medium');
  return <span className={`ui-badge priority-${normalized}`}>{normalized}</span>;
}
