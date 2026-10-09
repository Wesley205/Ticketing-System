import { useEffect, useState } from 'react';
import {
  DEFAULT_DASHBOARD_FILTERS,
  FALLBACK_TICKET_CATEGORIES,
  FALLBACK_TICKET_TYPES,
  fetchDashboardFilterOptions,
  fetchDashboardStats,
} from '../services/dashboard-api.js';

export function useDashboard({ canUseGlobalFilters = false, enabled = true } = {}) {
  const [filters, setFilters] = useState(DEFAULT_DASHBOARD_FILTERS);
  const [draftFilters, setDraftFilters] = useState(DEFAULT_DASHBOARD_FILTERS);
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    technicians: [],
    ticket_categories: FALLBACK_TICKET_CATEGORIES,
    ticket_types: FALLBACK_TICKET_TYPES,
  });
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadFilterOptions() {
    if (!enabled) return;
    if (!canUseGlobalFilters) return;

    setIsFilterLoading(true);
    try {
      const data = await fetchDashboardFilterOptions();
      setFilterOptions((current) => ({
        ...current,
        departments: Array.isArray(data.departments) ? data.departments : [],
        technicians: Array.isArray(data.technicians) ? data.technicians : [],
        ticket_categories: Array.isArray(data.ticket_categories) ? data.ticket_categories : current.ticket_categories,
        ticket_types: Array.isArray(data.ticket_types) ? data.ticket_types : current.ticket_types,
      }));
    } catch {
      setFilterOptions((current) => ({
        ...current,
        departments: [],
        technicians: [],
      }));
    } finally {
      setIsFilterLoading(false);
    }
  }

  async function loadDashboard(nextFilters = filters) {
    if (!enabled) return null;
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchDashboardStats(nextFilters);
      setStats(data);
      setLastUpdated(new Date());
      return data;
    } catch (loadError) {
      setError(loadError.message || 'Failed to load dashboard metrics.');
      setStats(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFilterOptions();
  }, [canUseGlobalFilters, enabled]);

  useEffect(() => {
    loadDashboard(filters);
  }, [filters, enabled]);

  function updateDraftFilter(key, value) {
    setDraftFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function applyFilters() {
    setFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(DEFAULT_DASHBOARD_FILTERS);
    setFilters(DEFAULT_DASHBOARD_FILTERS);
  }

  return {
    applyFilters,
    draftFilters,
    error,
    filterOptions,
    filters,
    isFilterLoading,
    isLoading,
    lastUpdated,
    loadDashboard,
    resetFilters,
    stats,
    updateDraftFilter,
  };
}
