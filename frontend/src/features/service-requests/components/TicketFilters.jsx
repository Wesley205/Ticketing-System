import { FormField } from '../../../components/forms/FormField.jsx';

export function TicketFilters({ filters, metadata, onChange }) {
  return (
    <div className="ticket-filters">
      <FormField label="Search" htmlFor="ticket-search">
        <input
          id="ticket-search"
          className="ui-input"
          placeholder="Search by subject, ticket number, requester, or assignee"
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
        />
      </FormField>

      <FormField label="Ticket Type" htmlFor="ticket-filter-type">
        <select
          id="ticket-filter-type"
          className="ui-input"
          value={filters.ticket_type}
          onChange={(event) => onChange('ticket_type', event.target.value)}
        >
          <option value="">All types</option>
          {(metadata.ticket_types || []).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Category" htmlFor="ticket-filter-category">
        <select
          id="ticket-filter-category"
          className="ui-input"
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
        >
          <option value="">All categories</option>
          {['Computer', 'Network', 'Printer', 'Internet', 'Software', 'Email', 'Hardware', 'Other'].map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Priority" htmlFor="ticket-filter-priority">
        <select
          id="ticket-filter-priority"
          className="ui-input"
          value={filters.priority}
          onChange={(event) => onChange('priority', event.target.value)}
        >
          <option value="">All priorities</option>
          {(metadata.priorities || []).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Status" htmlFor="ticket-filter-status">
        <select
          id="ticket-filter-status"
          className="ui-input"
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
        >
          <option value="">All statuses</option>
          {(metadata.statuses || []).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </FormField>

      <label className="ticket-checkbox">
        <input
          type="checkbox"
          checked={filters.mine}
          onChange={(event) => onChange('mine', event.target.checked)}
        />
        <span>Only my tickets</span>
      </label>
    </div>
  );
}
