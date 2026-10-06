import { apiClient } from '../../../lib/api-client.js';

export async function fetchFloors(options = {}) {
  const suffix = options.includeInactive ? '?include_inactive=true' : '';
  return apiClient(`/floors${suffix}`);
}
