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

const priorityRank = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

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

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isToday(value, now = new Date()) {
  const date = dateValue(value);
  if (!date) return false;

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function ticketDueDate(ticket) {
  return dateValue(ticket.sla_resolution_due_at || ticket.expected_completion_at || ticket.due_at);
}

function maintenanceDueDate(record) {
  return dateValue(record.next_due_at || record.scheduled_start_at || record.maintenance_date);
}

export function formatRelativeMinutes(target, now = new Date()) {
  const date = dateValue(target);
  if (!date) return 'Not scheduled';

  const minutes = Math.round((date.getTime() - now.getTime()) / 60000);
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const mins = absolute % 60;
  const label = hours ? `${hours}h ${mins}m` : `${mins}m`;

  return minutes < 0 ? `${label} overdue` : `${label} left`;
}

export function buildTechnicianDashboard(tickets = [], maintenance = [], now = new Date()) {
  const activeTickets = filterWorkByTab(tickets, 'active');
  const activeMaintenance = filterWorkByTab(maintenance, 'active');

  const overdueTickets = activeTickets.filter((ticket) => {
    if (ticket.sla?.resolutionOverdue || ticket.sla?.expectedCompletionOverdue) return true;
    const dueAt = ticketDueDate(ticket);
    return dueAt ? dueAt.getTime() < now.getTime() : false;
  });

  const todayMaintenance = activeMaintenance.filter((record) => {
    const dueAt = maintenanceDueDate(record);
    return dueAt ? isToday(dueAt, now) || dueAt.getTime() < now.getTime() : false;
  });

  const priorityQueue = [...activeTickets]
    .sort((left, right) => {
      const leftRank = priorityRank[left.priority] ?? 4;
      const rightRank = priorityRank[right.priority] ?? 4;
      if (leftRank !== rightRank) return leftRank - rightRank;

      const leftDue = ticketDueDate(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightDue = ticketDueDate(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue;
    })
    .slice(0, 6)
    .map((ticket) => ({
      ...ticket,
      slaLabel: formatRelativeMinutes(ticketDueDate(ticket), now),
      isOverdue: overdueTickets.some((candidate) => candidate.request_id === ticket.request_id),
    }));

  const nextTicket = priorityQueue.find((ticket) => ticket.isOverdue) || priorityQueue[0] || null;
  const nextMaintenance = todayMaintenance[0] || null;

  return {
    overdueTickets,
    todayMaintenance,
    priorityQueue,
    nextAction: nextTicket
      ? { type: 'ticket', item: nextTicket, href: `/technician/work/ticket/${nextTicket.request_id}` }
      : nextMaintenance
        ? { type: 'maintenance', item: nextMaintenance, href: `/technician/work/maintenance/${nextMaintenance.maintenance_id}` }
        : null,
  };
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
