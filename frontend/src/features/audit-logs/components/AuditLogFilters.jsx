import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';

export function AuditLogFilters({ filters, isLoading = false, onChange, onReset, onApply }) {
  return (
    <div className="audit-log-filters">
      <FormField label="Date from" htmlFor="audit-from-react">
        <input
          id="audit-from-react"
          className="ui-input"
          type="date"
          value={filters.from}
          onChange={(event) => onChange('from', event.target.value)}
        />
      </FormField>

      <FormField label="Date to" htmlFor="audit-to-react">
        <input
          id="audit-to-react"
          className="ui-input"
          type="date"
          value={filters.to}
          onChange={(event) => onChange('to', event.target.value)}
        />
      </FormField>

      <FormField label="Actor" htmlFor="audit-user-react">
        <input
          id="audit-user-react"
          className="ui-input"
          type="number"
          min="1"
          value={filters.user_id}
          placeholder="Search staff name or ID"
          onChange={(event) => onChange('user_id', event.target.value)}
        />
      </FormField>

      <FormField label="Action type" htmlFor="audit-action-react">
        <input
          id="audit-action-react"
          className="ui-input"
          value={filters.action}
          placeholder="All actions"
          onChange={(event) => onChange('action', event.target.value)}
        />
      </FormField>

      <FormField label="Entries" htmlFor="audit-limit-react">
        <select
          id="audit-limit-react"
          className="ui-input"
          value={filters.limit}
          onChange={(event) => onChange('limit', event.target.value)}
        >
          <option value="25">25 records</option>
          <option value="50">50 records</option>
          <option value="100">100 records</option>
          <option value="200">200 records</option>
        </select>
      </FormField>

      <div className="audit-log-filter-actions">
        <Button onClick={onApply} disabled={isLoading}>Apply</Button>
        <Button variant="secondary" onClick={onReset} disabled={isLoading}>Clear</Button>
      </div>
    </div>
  );
}
