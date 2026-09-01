import {
  fetchAssignedTickets,
  fetchTicketDetail,
  updateTicketStatus,
  addTicketComment,
  uploadTicketAttachment,
  downloadTicketAttachment,
} from '../../service-requests/services/service-requests-api.js';
import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function buildMaintenanceQuery(filters = {}) {
  return buildQueryParams({
    status: filters.status || '',
  });
}

export function filterMaintenanceBySearch(records = [], searchTerm = '') {
  const value = String(searchTerm || '').trim().toLowerCase();
  if (!value) return records;

  return records.filter((record) => {
    const haystack = [
      record.asset_tag,
      record.asset_type,
      record.problem,
      record.notes,
      record.status,
      record.maintenance_type,
      record.technician_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(value);
  });
}

export function splitTechnicianWorkItems(tickets = [], maintenance = []) {
  const activeTickets = tickets.filter((ticket) => !['Resolved', 'Closed', 'Cancelled'].includes(ticket.status));
  const completedTickets = tickets.filter((ticket) => ['Resolved', 'Closed'].includes(ticket.status));
  const activeMaintenance = maintenance.filter((record) => !['Completed', 'Cancelled'].includes(record.status));
  const completedMaintenance = maintenance.filter((record) => ['Completed', 'Cancelled'].includes(record.status));

  return {
    activeTickets,
    completedTickets,
    activeMaintenance,
    completedMaintenance,
  };
}

export function filterWorkByTab(records = [], tab = 'active') {
  if (tab === 'pending_resolution') {
    return records.filter((record) =>
      ['Accepted', 'In Progress', 'Waiting for User', 'Waiting for Parts', 'Resolved'].includes(record.status)
    );
  }
  if (tab === 'completed') {
    return records.filter((record) => ['Resolved', 'Closed', 'Completed', 'Cancelled'].includes(record.status));
  }
  return records.filter((record) => !['Resolved', 'Closed', 'Completed', 'Cancelled'].includes(record.status));
}

export async function fetchTechnicianAssignedTickets() {
  return fetchAssignedTickets();
}

export async function fetchTechnicianTicketDetail(ticketId) {
  return fetchTicketDetail(ticketId);
}

export async function fetchAssignedMaintenance(filters = {}) {
  const query = buildMaintenanceQuery(filters).toString();
  const suffix = query ? `?${query}` : '';
  return apiClient(`/maintenance${suffix}`);
}

export async function updateTechnicianTicketStatus(ticketId, payload) {
  return updateTicketStatus(ticketId, payload);
}

export async function addTechnicianTicketComment(ticketId, payload) {
  return addTicketComment(ticketId, payload);
}

export async function uploadTechnicianTicketAttachment(ticketId, { file, is_internal }) {
  const content_base64 = await readFileAsDataUrl(file);
  return uploadTicketAttachment(ticketId, {
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    content_base64,
    is_internal: !!is_internal,
  });
}

export async function downloadTechnicianTicketAttachment(ticketId, attachmentId) {
  return downloadTicketAttachment(ticketId, attachmentId);
}

export async function updateMaintenanceWork(maintenanceId, payload) {
  return apiClient(`/maintenance/${maintenanceId}`, {
    method: 'PUT',
    body: payload,
  });
}
