import { FormField } from '../../../components/forms/FormField.jsx';

export function ScheduleFilters({ filters, assets = [], onChange }) {
  return (
    <div className="maintenance-filters">
      <FormField label="Search" htmlFor="schedule-search">
        <input
          id="schedule-search"
          className="ui-input"
          value={filters.search}
          placeholder="Search schedule, asset, type, or technician"
          onChange={(event) => onChange('search', event.target.value)}
        />
      </FormField>

      <FormField label="Asset" htmlFor="schedule-asset-filter">
        <select
          id="schedule-asset-filter"
          className="ui-input"
          value={filters.asset_id}
          onChange={(event) => onChange('asset_id', event.target.value)}
        >
          <option value="">All Assets</option>
          {assets.map((asset) => (
            <option key={asset.asset_id} value={asset.asset_id}>
              {asset.asset_tag} - {asset.asset_type}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Schedule State" htmlFor="schedule-active-filter">
        <select
          id="schedule-active-filter"
          className="ui-input"
          value={filters.is_active}
          onChange={(event) => onChange('is_active', event.target.value)}
        >
          <option value="">All Schedules</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </FormField>
    </div>
  );
}
