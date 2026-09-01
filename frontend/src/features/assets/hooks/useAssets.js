import { useEffect, useMemo, useState } from 'react';
import {
  ASSET_CONDITIONS,
  ASSET_STATUSES,
  ASSET_TYPES,
  createAsset,
  fetchAssets,
  fetchDepartments,
  fetchStaff,
  filterAssetsBySearch,
  paginateAssets,
} from '../services/assets-api.js';

const DEFAULT_FILTERS = {
  search: '',
  status: '',
  asset_type: '',
  department_id: '',
};

export function useAssets({ pageSize = 8 } = {}) {
  const [assets, setAssets] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lookups, setLookups] = useState({
    departments: [],
    staff: [],
    statuses: ASSET_STATUSES,
    asset_types: ASSET_TYPES,
    conditions: ASSET_CONDITIONS,
  });

  async function loadLookups() {
    try {
      const [departments, staff] = await Promise.all([
        fetchDepartments().catch(() => []),
        fetchStaff().catch(() => []),
      ]);

      setLookups((current) => ({
        ...current,
        departments: Array.isArray(departments) ? departments : [],
        staff: Array.isArray(staff) ? staff : [],
      }));
    } catch {
      setLookups((current) => ({
        ...current,
        departments: [],
        staff: [],
      }));
    }
  }

  async function loadAssets(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    try {
      const rows = await fetchAssets(nextFilters);
      setAssets(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load assets.');
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadAssets(filters);
  }, [filters.status, filters.asset_type, filters.department_id]);

  const searchedAssets = useMemo(
    () => filterAssetsBySearch(assets, filters.search),
    [assets, filters.search]
  );

  const pagination = useMemo(
    () => paginateAssets(searchedAssets, page, pageSize),
    [page, pageSize, searchedAssets]
  );

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(1);
    }
  }, [page, pagination.totalPages]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }

  async function submitCreateAsset(payload) {
    setIsSubmitting(true);
    try {
      const created = await createAsset(payload);
      await loadAssets(filters);
      return created;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    assets: pagination.items,
    error,
    filters,
    isLoading,
    isSubmitting,
    loadAssets,
    lookups,
    pagination,
    setPage,
    submitCreateAsset,
    totalAssets: searchedAssets.length,
    updateFilter,
  };
}
