import { FormField } from '../../../components/forms/FormField.jsx';

export function AssetFilters({ filters, lookups, onChange }) {
  return (
    <div className="ui-grid-2 asset-filter-grid">
      <FormField label="Search" htmlFor="asset-filter-search">
        <input
          id="asset-filter-search"
          className="ui-input"
          placeholder="Tag, brand, model, serial, department..."
          value={filters.search}
          onChange={(event) => onChange('search', event.target.value)}
        />
      </FormField>

      <FormField label="Status" htmlFor="asset-filter-status">
        <select
          id="asset-filter-status"
          className="ui-input"
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
        >
          <option value="">All statuses</option>
          {(lookups.statuses || []).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Asset Type" htmlFor="asset-filter-type">
        <select
          id="asset-filter-type"
          className="ui-input"
          value={filters.asset_type}
          onChange={(event) => onChange('asset_type', event.target.value)}
        >
          <option value="">All types</option>
          {(lookups.asset_types || []).map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Department" htmlFor="asset-filter-department">
        <select
          id="asset-filter-department"
          className="ui-input"
          value={filters.department_id}
          onChange={(event) => onChange('department_id', event.target.value)}
        >
          <option value="">All departments</option>
          {(lookups.departments || []).map((department) => (
            <option key={department.department_id} value={department.department_id}>
              {department.name}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  );
}
