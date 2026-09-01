import { useEffect, useState } from 'react';
import {
  addTechnicianTicketComment,
  downloadTechnicianTicketAttachment,
  fetchAssignedMaintenance,
  fetchTechnicianTicketDetail,
  updateMaintenanceWork,
  updateTechnicianTicketStatus,
  uploadTechnicianTicketAttachment,
} from '../services/technician-api.js';
import { fetchAssignmentHistory } from '../../service-requests/services/service-requests-api.js';

export function useWorkExecution(type, id) {
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    if (!type || !id) {
      setItem(null);
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      if (type === 'ticket') {
        const [ticket, assignmentHistory] = await Promise.all([
          fetchTechnicianTicketDetail(id),
          fetchAssignmentHistory(id).catch(() => []),
        ]);

        const nextTicket = {
          ...ticket,
          assignment_history: assignmentHistory.length ? assignmentHistory : ticket.assignment_history || [],
        };
        setItem(nextTicket);
        return nextTicket;
      }

      const rows = await fetchAssignedMaintenance();
      const maintenance = Array.isArray(rows)
        ? rows.find((record) => Number(record.maintenance_id) === Number(id))
        : null;

      if (!maintenance) {
        throw new Error('Maintenance record not found in your assigned queue.');
      }

      setItem(maintenance);
      return maintenance;
    } catch (loadError) {
      setError(loadError.message || 'Failed to load the selected work item.');
      setItem(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [type, id]);

  async function runMutation(callback) {
    setIsMutating(true);
    setError('');
    try {
      const result = await callback();
      await refresh();
      return result;
    } catch (mutationError) {
      setError(mutationError.message || 'Failed to update the work item.');
      throw mutationError;
    } finally {
      setIsMutating(false);
    }
  }

  return {
    error,
    isLoading,
    isMutating,
    item,
    refresh,
    addComment: (payload) => runMutation(() => addTechnicianTicketComment(id, payload)),
    downloadAttachment: (attachmentId) => downloadTechnicianTicketAttachment(id, attachmentId),
    submitMaintenanceUpdate: (payload) => runMutation(() => updateMaintenanceWork(id, payload)),
    submitTicketStatus: (payload) => runMutation(() => updateTechnicianTicketStatus(id, payload)),
    uploadAttachment: (payload) => runMutation(() => uploadTechnicianTicketAttachment(id, payload)),
  };
}
