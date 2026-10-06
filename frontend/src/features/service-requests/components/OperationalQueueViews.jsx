const QUEUE_VIEWS = [
  { value: '', label: 'All tickets' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'sla_risk', label: 'SLA risk' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'pending_approval', label: 'Approvals' },
];

export function OperationalQueueViews({ value = '', onChange }) {
  return (
    <nav className="service-request-queue-views" aria-label="Operational queue views">
      {QUEUE_VIEWS.map((view) => (
        <button
          key={view.value || 'all'}
          type="button"
          className={value === view.value ? 'active' : ''}
          aria-pressed={value === view.value}
          onClick={() => onChange(view.value)}
        >
          {view.label}
        </button>
      ))}
    </nav>
  );
}
