import { useEffect, useState } from 'react';
import { DEFAULT_AUDIT_FILTERS, fetchAuditLogs } from '../services/audit-logs-api.js';

export function useAuditLogs({ enabled = true } = {}) {
  const [filters, setFilters] = useState(DEFAULT_AUDIT_FILTERS);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState('');

  async function loadAuditLogs(nextFilters = filters) {
    if (!enabled) return [];

    setIsLoading(true);
    setError('');
    try {
      const nextRows = await fetchAuditLogs(nextFilters);
      setRows(nextRows);
      return nextRows;
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
      setRows([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_AUDIT_FILTERS);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadAuditLogs(filters);
    }, 250);

    return () => clearTimeout(timer);
  }, [enabled, filters.action, filters.user_id, filters.from, filters.to, filters.limit]);

  return {
    error,
    filters,
    isLoading,
    rows,
    loadAuditLogs,
    resetFilters,
    updateFilter,
  };
}
