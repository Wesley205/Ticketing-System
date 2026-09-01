import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';

export function AuditLogFilters({ filters, isLoading = false, onChange, onReset }) {
  return (
    <div className="audit-log-filters">
      <FormField label="Action" htmlFor="audit-action-react">
        <input
          id="audit-action-react"
          className="ui-input"
          value={filters.action}
          placeholder="Filter by action, e.g. logged in"
          onChange={(event) => onChange('action', event.target.value)}
        />
      </FormField>

      <FormField label="User ID" htmlFor="audit-user-react">
        <input
          id="audit-user-react"
          className="ui-input"
          type="number"
          min="1"
          value={filters.user_id}
          placeholder="Optional user ID"
          onChange={(event) => onChange('user_id', event.target.value)}
        />
      </FormField>

      <FormField label="From" htmlFor="audit-from-react">
        <input
          id="audit-from-react"
          className="ui-input"
          type="date"
          value={filters.from}
          onChange={(event) => onChange('from', event.target.value)}
        />
      </FormField>

      <FormField label="To" htmlFor="audit-to-react">
        <input
          id="audit-to-react"
          className="ui-input"
          type="date"
          value={filters.to}
          onChange={(event) => onChange('to', event.target.value)}
        />
      </FormField>

      <FormField label="Limit" htmlFor="audit-limit-react">
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
        <Button variant="secondary" onClick={onReset} disabled={isLoading}>Reset</Button>
      </div>
    </div>
  );
}
