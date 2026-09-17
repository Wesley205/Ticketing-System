import { useEffect, useMemo, useState } from 'react';
import {
  USER_ROLES,
  USER_TYPES,
  createStaff,
  fetchDepartments,
  fetchStaff,
  filterIctOfficers,
  filterStaffBySearch,
  paginateStaff,
} from '../services/staff-api.js';

const DEFAULT_FILTERS = {
  search: '',
  role: '',
  user_type: '',
  department_id: '',
};

export function useStaff({ pageSize = 8 } = {}) {
  const [staff, setStaff] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lookups, setLookups] = useState({
    roles: USER_ROLES,
    user_types: USER_TYPES,
    departments: [],
    ict_officers: [],
  });

  async function loadLookups() {
    try {
      const [departments, staffRows] = await Promise.all([
        fetchDepartments().catch(() => []),
        fetchStaff({ role: 'ict_officer' }).catch(() => []),
      ]);
      setLookups((current) => ({
        ...current,
        departments: Array.isArray(departments) ? departments : [],
        ict_officers: filterIctOfficers(Array.isArray(staffRows) ? staffRows : []),
      }));
    } catch {
      setLookups((current) => ({
        ...current,
        departments: [],
        ict_officers: [],
      }));
    }
  }

  async function loadStaff(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    try {
      const rows = await fetchStaff(nextFilters);
      setStaff(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load staff.');
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadStaff(filters);
  }, [filters.role, filters.user_type, filters.department_id]);

  const searchedStaff = useMemo(
    () => filterStaffBySearch(staff, filters.search),
    [filters.search, staff]
  );

  const pagination = useMemo(
    () => paginateStaff(searchedStaff, page, pageSize),
    [page, pageSize, searchedStaff]
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

  async function submitCreateStaff(payload) {
    setIsSubmitting(true);
    try {
      const created = await createStaff(payload);
      await loadStaff(filters);
      return created;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    error,
    filters,
    isLoading,
    isSubmitting,
    loadStaff,
    lookups,
    pagination,
    setPage,
    staff: pagination.items,
    submitCreateStaff,
    totalStaff: searchedStaff.length,
    updateFilter,
  };
}
