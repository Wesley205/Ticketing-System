import { useEffect, useMemo, useState } from 'react';
import {
  createTicket,
  fetchAssignedTickets,
  fetchTicketMetadata,
  fetchTickets,
  filterTicketsBySearch,
  paginateTickets,
  uploadTicketImage,
} from '../services/service-requests-api.js';

const DEFAULT_FILTERS = {
  status: '',
  priority: '',
  category: '',
  ticket_type: '',
  mine: false,
  queue: '',
  search: '',
};

const QUEUE_PREFERENCE_KEY = 'nsc-service-desk-queue-view';

function queuePreferenceKey(role, userId) {
  return `${QUEUE_PREFERENCE_KEY}:${userId || role || 'anonymous'}`;
}

function initialFilters(role, userId) {
  if (typeof window === 'undefined' || !['admin', 'ict_officer'].includes(role)) return DEFAULT_FILTERS;
  const queue = window.localStorage.getItem(queuePreferenceKey(role, userId)) || '';
  return { ...DEFAULT_FILTERS, queue: ['unassigned', 'sla_risk', 'overdue', 'pending_approval'].includes(queue) ? queue : '' };
}

export function useTickets({ role, userId, pageSize = 8 } = {}) {
  const [metadata, setMetadata] = useState({
    priorities: ['Low', 'Medium', 'High', 'Critical'],
    statuses: ['New', 'Pending', 'Assigned', 'Accepted', 'In Progress', 'Waiting for User', 'Waiting for Parts', 'Resolved', 'Closed', 'Reopened', 'Cancelled'],
    ticket_types: ['Incident', 'Service Request', 'Access Request', 'Maintenance Request', 'Change Request'],
  });
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState(() => initialFilters(role, userId));
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadMetadata() {
    try {
      const data = await fetchTicketMetadata();
      setMetadata((current) => ({
        ...current,
        ...data,
      }));
    } catch {
      // Keep frontend defaults.
    }
  }

  async function loadTickets(nextFilters = filters) {
    setIsLoading(true);
    setError('');

    try {
      const data = role === 'technician' && nextFilters.mine
        ? await fetchAssignedTickets()
        : await fetchTickets(nextFilters);
      setTickets(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load tickets.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadTickets(filters);
  }, [filters.mine, filters.priority, filters.status, filters.category, filters.ticket_type, filters.queue]);

  const searchedTickets = useMemo(
    () => filterTicketsBySearch(tickets, filters.search),
    [tickets, filters.search]
  );

  const pagination = useMemo(
    () => paginateTickets(searchedTickets, page, pageSize),
    [page, pageSize, searchedTickets]
  );

  useEffect(() => {
    if (page > pagination.totalPages) {
      setPage(1);
    }
  }, [page, pagination.totalPages]);

  function updateFilter(key, value) {
    if (key === 'queue' && typeof window !== 'undefined') {
      window.localStorage.setItem(queuePreferenceKey(role, userId), value || '');
    }
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
    setPage(1);
  }

  function clearFilters() {
    if (typeof window !== 'undefined') window.localStorage.removeItem(queuePreferenceKey(role, userId));
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  }

  async function submitCreateTicket(payload, images = []) {
    setIsSubmitting(true);
    try {
      const created = await createTicket(payload);
      if (created?.request_id && images.length) {
        for (const image of images) {
          await uploadTicketImage(created.request_id, image, { is_internal: false });
        }
      }
      await loadTickets(filters);
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
    loadTickets,
    metadata,
    pagination,
    setPage,
    submitCreateTicket,
    tickets: pagination.items,
    totalTickets: searchedTickets.length,
    clearFilters,
    updateFilter,
  };
}
