import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';

export function DashboardFilters({
  filters,
  filterOptions,
  canUseGlobalFilters = false,
  isLoading = false,
  onChange,
  onApply,
  onReset,
}) {
  return (
    <div className="dashboard-filters responsive-filter-grid">
      <FormField label="From" htmlFor="dashboard-date-from">
        <input
          id="dashboard-date-from"
          className="ui-input"
          type="date"
          value={filters.date_from}
          onChange={(event) => onChange('date_from', event.target.value)}
        />
      </FormField>

      <FormField label="To" htmlFor="dashboard-date-to">
        <input
          id="dashboard-date-to"
          className="ui-input"
          type="date"
          value={filters.date_to}
          onChange={(event) => onChange('date_to', event.target.value)}
        />
      </FormField>

      {canUseGlobalFilters ? (
        <>
          <FormField label="Department" htmlFor="dashboard-department">
            <select
              id="dashboard-department"
              className="ui-input"
              value={filters.department_id}
              onChange={(event) => onChange('department_id', event.target.value)}
            >
              <option value="">All departments</option>
              {(filterOptions.departments || []).map((department) => (
                <option key={department.department_id} value={department.department_id}>
                  {department.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Technician" htmlFor="dashboard-technician">
            <select
              id="dashboard-technician"
              className="ui-input"
              value={filters.technician_id}
              onChange={(event) => onChange('technician_id', event.target.value)}
            >
              <option value="">All technicians</option>
              {(filterOptions.technicians || []).map((technician) => (
                <option key={technician.user_id} value={technician.user_id}>
                  {technician.full_name}
                </option>
              ))}
            </select>
          </FormField>
        </>
      ) : null}

      <FormField label="Category" htmlFor="dashboard-category">
        <select
          id="dashboard-category"
          className="ui-input"
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
        >
          <option value="">All categories</option>
          {(filterOptions.ticket_categories || []).map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Ticket Type" htmlFor="dashboard-ticket-type">
        <select
          id="dashboard-ticket-type"
          className="ui-input"
          value={filters.ticket_type}
          onChange={(event) => onChange('ticket_type', event.target.value)}
        >
          <option value="">All ticket types</option>
          {(filterOptions.ticket_types || []).map((ticketType) => (
            <option key={ticketType} value={ticketType}>{ticketType}</option>
          ))}
        </select>
      </FormField>

      <div className="dashboard-filter-actions">
        <Button variant="secondary" onClick={onReset} disabled={isLoading}>Reset</Button>
        <Button onClick={onApply} disabled={isLoading}>Apply</Button>
      </div>
    </div>
  );
}
