import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_MAINTENANCE_FILTERS,
  DEFAULT_SCHEDULE_FILTERS,
  createMaintenance,
  createSchedule,
  fetchAssetLookup,
  fetchMaintenance,
  fetchSchedules,
  fetchStaffLookup,
  filterMaintenanceBySearch,
  filterSchedulesBySearch,
  markMaintenanceComplete,
  updateMaintenance,
  updateSchedule,
} from '../services/maintenance-api.js';

export function useMaintenance({ enabled = true } = {}) {
  const [filters, setFilters] = useState(DEFAULT_MAINTENANCE_FILTERS);
  const [scheduleFilters, setScheduleFilters] = useState(DEFAULT_SCHEDULE_FILTERS);
  const [records, setRecords] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [lookups, setLookups] = useState({ assets: [], staff: [] });
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function refresh(nextFilters = filters, nextScheduleFilters = scheduleFilters) {
    if (!enabled) return;

    setIsLoading(true);
    setError('');
    try {
      const [nextRecords, nextSchedules, assets, staff] = await Promise.all([
        fetchMaintenance(nextFilters),
        fetchSchedules(nextScheduleFilters),
        fetchAssetLookup(),
        fetchStaffLookup().catch(() => []),
      ]);
      setRecords(Array.isArray(nextRecords) ? nextRecords : []);
      setSchedules(Array.isArray(nextSchedules) ? nextSchedules : []);
      setLookups({
        assets: Array.isArray(assets) ? assets : [],
        staff: Array.isArray(staff) ? staff : [],
      });
    } catch (err) {
      setError(err.message || 'Failed to load maintenance workspace.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh(filters, scheduleFilters);
  }, [enabled, filters.status, filters.asset_id, scheduleFilters.asset_id, scheduleFilters.is_active]);

  const filteredRecords = useMemo(
    () => filterMaintenanceBySearch(records, filters.search),
    [records, filters.search],
  );

  const filteredSchedules = useMemo(
    () => filterSchedulesBySearch(schedules, scheduleFilters.search),
    [schedules, scheduleFilters.search],
  );

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function updateScheduleFilter(key, value) {
    setScheduleFilters((current) => ({ ...current, [key]: value }));
  }

  async function submitMaintenance(payload) {
    setIsSubmitting(true);
    try {
      const saved = await createMaintenance(payload);
      await refresh(filters, scheduleFilters);
      return saved;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitMaintenanceUpdate(maintenanceId, payload) {
    setIsSubmitting(true);
    try {
      const saved = await updateMaintenance(maintenanceId, payload);
      await refresh(filters, scheduleFilters);
      return saved;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function completeMaintenance(maintenanceId, payload = {}) {
    setIsSubmitting(true);
    try {
      const saved = await markMaintenanceComplete(maintenanceId, payload);
      await refresh(filters, scheduleFilters);
      return saved;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitSchedule(payload) {
    setIsSubmitting(true);
    try {
      const saved = await createSchedule(payload);
      await refresh(filters, scheduleFilters);
      return saved;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitScheduleUpdate(scheduleId, payload) {
    setIsSubmitting(true);
    try {
      const saved = await updateSchedule(scheduleId, payload);
      await refresh(filters, scheduleFilters);
      return saved;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    filters,
    scheduleFilters,
    records: filteredRecords,
    schedules: filteredSchedules,
    allRecords: records,
    allSchedules: schedules,
    lookups,
    isLoading,
    isSubmitting,
    error,
    updateFilter,
    updateScheduleFilter,
    refresh,
    submitMaintenance,
    submitMaintenanceUpdate,
    completeMaintenance,
    submitSchedule,
    submitScheduleUpdate,
  };
}
