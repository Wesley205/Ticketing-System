import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';

export function ReportFilters({
  filters,
  options,
  onChange,
  onApply,
  onReset,
  isLoading = false,
}) {
  return (
    <section className="report-filters responsive-filter-grid" aria-label="Report filters">
      <FormField label="From" htmlFor="report-date-from">
        <input
          id="report-date-from"
          type="date"
          className="ui-input"
          value={filters.date_from}
          onChange={(event) => onChange('date_from', event.target.value)}
        />
      </FormField>

      <FormField label="To" htmlFor="report-date-to">
        <input
          id="report-date-to"
          type="date"
          className="ui-input"
          value={filters.date_to}
          onChange={(event) => onChange('date_to', event.target.value)}
        />
      </FormField>

      <FormField label="Department" htmlFor="report-department">
        <select
          id="report-department"
          className="ui-input"
          value={filters.department_id}
          onChange={(event) => onChange('department_id', event.target.value)}
        >
          <option value="">All Departments</option>
          {options.departments.map((department) => (
            <option key={department.department_id} value={department.department_id}>
              {department.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Technician" htmlFor="report-technician">
        <select
          id="report-technician"
          className="ui-input"
          value={filters.technician_id}
          onChange={(event) => onChange('technician_id', event.target.value)}
        >
          <option value="">All Technicians</option>
          {options.technicians.map((technician) => (
            <option key={technician.user_id} value={technician.user_id}>
              {technician.full_name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Category" htmlFor="report-category">
        <select
          id="report-category"
          className="ui-input"
          value={filters.category}
          onChange={(event) => onChange('category', event.target.value)}
        >
          <option value="">All Categories</option>
          {options.ticket_categories.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Ticket Type" htmlFor="report-ticket-type">
        <select
          id="report-ticket-type"
          className="ui-input"
          value={filters.ticket_type}
          onChange={(event) => onChange('ticket_type', event.target.value)}
        >
          <option value="">All Ticket Types</option>
          {options.ticket_types.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </FormField>

      <div className="report-filter-actions">
        <Button variant="secondary" onClick={onReset} disabled={isLoading}>Reset</Button>
        <Button onClick={onApply} disabled={isLoading}>Apply Filters</Button>
      </div>
    </section>
  );
}
