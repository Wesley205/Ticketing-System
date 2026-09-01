import { FormField } from '../../../components/forms/FormField.jsx';
import { MAINTENANCE_STATUSES } from '../services/maintenance-api.js';

export function MaintenanceFilters({ filters, assets = [], onChange }) {
  return (
    <div className="maintenance-filters">
      <FormField label="Search" htmlFor="maintenance-search">
        <input
          id="maintenance-search"
          className="ui-input"
          value={filters.search}
          placeholder="Search asset, problem, notes, or technician"
          onChange={(event) => onChange('search', event.target.value)}
        />
      </FormField>

      <FormField label="Status" htmlFor="maintenance-status">
        <select
          id="maintenance-status"
          className="ui-input"
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
        >
          <option value="">All Statuses</option>
          {MAINTENANCE_STATUSES.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>
      </FormField>

      <FormField label="Asset" htmlFor="maintenance-asset-filter">
        <select
          id="maintenance-asset-filter"
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
    </div>
  );
}
