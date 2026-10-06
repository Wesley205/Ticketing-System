import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export const ASSET_TYPES = [
  'Laptop',
  'Desktop',
  'Printer',
  'Scanner',
  'Router',
  'Switch',
  'Server',
  'Monitor',
  'UPS',
  'Projector',
  'Other',
];

export const ASSET_STATUSES = [
  'Available',
  'Active',
  'Assigned',
  'Under Maintenance',
  'Damaged',
  'Retired',
];

export const ASSET_CONDITIONS = ['New', 'Good', 'Fair', 'Poor'];

export function buildAssetListQuery(filters = {}) {
  return buildQueryParams({
    search: filters.search || '',
    status: filters.status || '',
    asset_type: filters.asset_type || '',
    department_id: filters.department_id || '',
  });
}

export function filterAssetsBySearch(assets = [], searchTerm = '') {
  const value = String(searchTerm || '').trim().toLowerCase();
  if (!value) return assets;

  return assets.filter((asset) => {
    const haystack = [
      asset.asset_tag,
      asset.asset_type,
      asset.brand,
      asset.model,
      asset.serial_number,
      asset.department_name,
      asset.floor_label,
      asset.assigned_staff_name,
      asset.location,
      asset.status,
      asset.condition,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(value);
  });
}

export function paginateAssets(assets = [], page = 1, pageSize = 10) {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const safePage = Math.max(1, Number(page) || 1);
  const total = assets.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safePageSize;

  return {
    page: currentPage,
    pageSize: safePageSize,
    total,
    totalPages,
    items: assets.slice(start, start + safePageSize),
  };
}

export async function fetchAssets(filters = {}) {
  const query = buildAssetListQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiClient(`/assets${suffix}`);
}

export async function fetchAssetDetail(assetId) {
  return apiClient(`/assets/${assetId}`);
}

export async function createAsset(payload) {
  return apiClient('/assets', {
    method: 'POST',
    body: payload,
  });
}

export async function updateAsset(assetId, payload) {
  return apiClient(`/assets/${assetId}`, {
    method: 'PUT',
    body: payload,
  });
}

export async function assignAsset(assetId, payload) {
  return apiClient(`/assets/${assetId}/assign`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function returnAsset(assetId, payload) {
  return apiClient(`/assets/${assetId}/return`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateAssetStatus(assetId, payload) {
  return apiClient(`/assets/${assetId}/status`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteAsset(assetId) {
  return apiClient(`/assets/${assetId}`, {
    method: 'DELETE',
  });
}

export async function fetchDepartments() {
  return apiClient('/departments');
}

export async function fetchStaff() {
  return apiClient('/staff');
}
