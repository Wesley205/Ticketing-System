import { apiClient, apiDownload } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export function buildTicketListQuery(filters = {}) {
  return buildQueryParams({
    status: filters.status || '',
    priority: filters.priority || '',
    category: filters.category || '',
    ticket_type: filters.ticket_type || '',
    mine: filters.mine ? 'true' : '',
  });
}

export function filterTicketsBySearch(tickets = [], searchTerm = '') {
  const value = String(searchTerm || '').trim().toLowerCase();
  if (!value) return tickets;

  return tickets.filter((ticket) => {
    const haystack = [
      ticket.ticket_number,
      ticket.subject,
      ticket.category,
      ticket.subcategory,
      ticket.ticket_type,
      ticket.priority,
      ticket.status,
      ticket.technician_name,
      ticket.requester_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(value);
  });
}

export function paginateTickets(tickets = [], page = 1, pageSize = 10) {
  const safePageSize = Math.max(1, Number(pageSize) || 10);
  const safePage = Math.max(1, Number(page) || 1);
  const total = tickets.length;
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safePageSize;

  return {
    page: currentPage,
    pageSize: safePageSize,
    total,
    totalPages,
    items: tickets.slice(start, start + safePageSize),
  };
}

export async function fetchTicketMetadata() {
  return apiClient('/service-requests/metadata/options');
}

export async function fetchTickets(filters = {}) {
  const query = buildTicketListQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiClient(`/service-requests${suffix}`);
}

export async function fetchAssignedTickets() {
  return apiClient('/service-requests/assigned-to-me');
}

export async function fetchTicketDetail(ticketId) {
  return apiClient(`/service-requests/${ticketId}`);
}

export async function fetchAssignmentHistory(ticketId) {
  return apiClient(`/service-requests/${ticketId}/assignment-history`);
}

export async function createTicket(payload) {
  return apiClient('/service-requests', {
    method: 'POST',
    body: payload,
  });
}

export async function assignTicket(ticketId, payload) {
  return apiClient(`/service-requests/${ticketId}/assign`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateTicketAsset(ticketId, payload) {
  return apiClient(`/service-requests/${ticketId}/affected-asset`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateTicketStatus(ticketId, payload) {
  return apiClient(`/service-requests/${ticketId}/status`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function addTicketComment(ticketId, payload) {
  return apiClient(`/service-requests/${ticketId}/comments`, {
    method: 'POST',
    body: payload,
  });
}

export async function uploadTicketAttachment(ticketId, payload) {
  return apiClient(`/service-requests/${ticketId}/attachments`, {
    method: 'POST',
    body: payload,
  });
}

export async function downloadTicketAttachment(ticketId, attachmentId) {
  return apiDownload(`/service-requests/${ticketId}/attachments/${attachmentId}/download`);
}

export async function fetchTicketSuggestions(params = {}) {
  const query = buildQueryParams({
    category: params.category || '',
    subcategory: params.subcategory || '',
    subject: params.subject || '',
    description: params.description || '',
    affected_asset_id: params.affected_asset_id || '',
    limit: params.limit || 5,
  }).toString();

  return apiClient(`/knowledge-base/suggestions?${query}`);
}

export async function fetchTechnicians() {
  return apiClient('/staff/technicians');
}

export async function fetchAssets() {
  return apiClient('/assets');
}
