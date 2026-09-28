import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { ActiveFilterChips } from './ActiveFilterChips.jsx';

export function ServiceRequestCommandBar({ filters, metadata, isOperational = false, onChange, onClear }) {
  const [moreOpen, setMoreOpen] = useState(false);

  function removeFilter(key) {
    onChange(key, key === 'mine' ? false : '');
  }

  return (
    <section className="service-request-command-bar" aria-label="Service request filters">
      <div className="service-request-command-primary">
        <FormField label="Search" htmlFor="ticket-search">
          <input
            id="ticket-search"
            className="ui-input"
            placeholder="Ticket number, subject, or requester"
            value={filters.search}
            onChange={(event) => onChange('search', event.target.value)}
          />
        </FormField>

        <FormField label="Status" htmlFor="ticket-filter-status">
          <select id="ticket-filter-status" className="ui-input" value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
            <option value="">All statuses</option>
            {(metadata.statuses || []).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </FormField>

        <FormField label="Priority" htmlFor="ticket-filter-priority">
          <select id="ticket-filter-priority" className="ui-input" value={filters.priority} onChange={(event) => onChange('priority', event.target.value)}>
            <option value="">All priorities</option>
            {(metadata.priorities || []).map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </FormField>

        <label className="ticket-checkbox service-request-mine-toggle">
          <input type="checkbox" checked={filters.mine} onChange={(event) => onChange('mine', event.target.checked)} />
          <span>{isOperational ? 'My tickets' : 'My requests'}</span>
        </label>

        <Button
          variant="secondary"
          className="service-request-more-filter-button ui-button-with-icon"
          onClick={() => setMoreOpen((current) => !current)}
          aria-expanded={moreOpen}
        >
          <span className="nsc-action-icon nsc-action-icon-filter" aria-hidden="true" />
          {moreOpen ? 'Hide filters' : 'Show filters'}
        </Button>
      </div>

      {moreOpen ? (
        <div className="service-request-command-more">
          <div className="service-request-mobile-extra-filters">
            <FormField label="Status" htmlFor="ticket-filter-status-mobile">
              <select id="ticket-filter-status-mobile" className="ui-input" value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
                <option value="">All statuses</option>
                {(metadata.statuses || []).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </FormField>

            <FormField label="Priority" htmlFor="ticket-filter-priority-mobile">
              <select id="ticket-filter-priority-mobile" className="ui-input" value={filters.priority} onChange={(event) => onChange('priority', event.target.value)}>
                <option value="">All priorities</option>
                {(metadata.priorities || []).map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </FormField>

            <label className="ticket-checkbox service-request-mine-toggle">
              <input type="checkbox" checked={filters.mine} onChange={(event) => onChange('mine', event.target.checked)} />
              <span>{isOperational ? 'My tickets' : 'My requests'}</span>
            </label>
          </div>

          <FormField label="Ticket Type" htmlFor="ticket-filter-type">
            <select id="ticket-filter-type" className="ui-input" value={filters.ticket_type} onChange={(event) => onChange('ticket_type', event.target.value)}>
              <option value="">All types</option>
              {(metadata.ticket_types || []).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FormField>

          <FormField label="Category" htmlFor="ticket-filter-category">
            <select id="ticket-filter-category" className="ui-input" value={filters.category} onChange={(event) => onChange('category', event.target.value)}>
              <option value="">All categories</option>
              {['Computer', 'Network', 'Printer', 'Internet', 'Software', 'Email', 'Hardware', 'Other'].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </FormField>
        </div>
      ) : null}

      <ActiveFilterChips filters={filters} onRemove={removeFilter} onClear={onClear} />
    </section>
  );
}
