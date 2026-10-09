import { useEffect, useMemo, useState } from 'react';
import {
  fetchAssignedMaintenance,
  fetchTechnicianAssignedTickets,
  buildTechnicianDashboard,
  filterMaintenanceBySearch,
  filterWorkByTab,
  splitTechnicianWorkItems,
} from '../services/technician-api.js';

const defaultFilters = {
  tab: 'active',
  ticketSearch: '',
  maintenanceSearch: '',
  maintenanceStatus: '',
};

export function useTechnicianWork() {
  const [filters, setFilters] = useState(defaultFilters);
  const [tickets, setTickets] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  async function refresh(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    try {
      const [ticketRows, maintenanceRows] = await Promise.all([
        fetchTechnicianAssignedTickets(),
        fetchAssignedMaintenance({ status: nextFilters.maintenanceStatus }),
      ]);
      setTickets(Array.isArray(ticketRows) ? ticketRows : []);
      setMaintenance(Array.isArray(maintenanceRows) ? maintenanceRows : []);
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(loadError.message || 'Failed to load technician work items.');
      setTickets([]);
      setMaintenance([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh(filters);
  }, [filters.maintenanceStatus]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const queues = useMemo(() => splitTechnicianWorkItems(tickets, maintenance), [tickets, maintenance]);
  const dashboard = useMemo(() => buildTechnicianDashboard(tickets, maintenance), [tickets, maintenance]);

  const visibleTickets = useMemo(() => {
    const filtered = filterWorkByTab(tickets, filters.tab);
    if (!filters.ticketSearch.trim()) return filtered;

    const value = filters.ticketSearch.trim().toLowerCase();
    return filtered.filter((ticket) =>
      [
        ticket.ticket_number,
        ticket.subject,
        ticket.status,
        ticket.priority,
        ticket.requester_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(value)
    );
  }, [tickets, filters.tab, filters.ticketSearch]);

  const visibleMaintenance = useMemo(() => {
    const filtered = filterWorkByTab(maintenance, filters.tab);
    return filterMaintenanceBySearch(filtered, filters.maintenanceSearch);
  }, [maintenance, filters.tab, filters.maintenanceSearch]);

  return {
    error,
    dashboard,
    filters,
    isLoading,
    lastUpdated,
    maintenance,
    queues,
    refresh,
    tickets,
    updateFilter,
    visibleMaintenance,
    visibleTickets,
  };
}
