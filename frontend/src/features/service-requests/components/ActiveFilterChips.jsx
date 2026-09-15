const FILTER_LABELS = {
  search: 'Search',
  status: 'Status',
  priority: 'Priority',
  category: 'Category',
  ticket_type: 'Type',
  mine: 'My tickets',
};

export function hasActiveFilters(filters = {}) {
  return Object.entries(filters).some(([key, value]) => key !== 'mine' ? Boolean(value) : value === true);
}

export function ActiveFilterChips({ filters = {}, onRemove, onClear }) {
  const entries = Object.entries(filters).filter(([key, value]) => key !== 'mine' ? Boolean(value) : value === true);
  if (!entries.length) return null;

  return (
    <div className="service-request-filter-chips" aria-label="Active filters">
      {entries.map(([key, value]) => (
        <button key={key} type="button" onClick={() => onRemove(key)}>
          <span>{FILTER_LABELS[key] || key}</span>
          <strong>{key === 'mine' ? 'On' : value}</strong>
          <b aria-hidden="true">x</b>
        </button>
      ))}
      <button type="button" className="service-request-clear-filters" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}
