import { apiClient } from '../../../lib/api-client.js';

export async function fetchServiceCatalog() {
  const rows = await apiClient('/service-catalog');
  return Array.isArray(rows) ? rows : [];
}
