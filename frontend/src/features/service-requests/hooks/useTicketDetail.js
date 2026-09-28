import { useEffect, useState } from 'react';
import {
  addTicketComment,
  assignTicket,
  downloadTicketAttachment,
  fetchAssets,
  fetchAssignmentHistory,
  fetchTechnicians,
  fetchTicketDetail,
  fetchTicketSuggestions,
  updateTicketAsset,
  updateTicketStatus,
  uploadTicketAttachment,
} from '../services/service-requests-api.js';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function useTicketDetail(ticketId) {
  const [ticket, setTicket] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [assets, setAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState('');

  async function refresh() {
    if (!ticketId) {
      setTicket(null);
      return null;
    }

    setIsLoading(true);
    setError('');

    try {
      const [detail, assignmentHistory] = await Promise.all([
        fetchTicketDetail(ticketId),
        fetchAssignmentHistory(ticketId).catch(() => []),
      ]);

      const nextTicket = {
        ...detail,
        assignment_history: assignmentHistory.length ? assignmentHistory : detail.assignment_history || [],
      };

      setTicket(nextTicket);
      return nextTicket;
    } catch (loadError) {
      setError(loadError.message || 'Failed to load ticket detail.');
      setTicket(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshSuggestions(source = ticket) {
    if (!source) {
      setSuggestions([]);
      return [];
    }

    try {
      const data = await fetchTicketSuggestions({
        category: source.category,
        subcategory: source.subcategory,
        subject: source.subject,
        description: source.description,
        affected_asset_id: source.affected_asset_id,
        limit: 5,
      });
      setSuggestions(Array.isArray(data) ? data : []);
      return data;
    } catch {
      setSuggestions([]);
      return [];
    }
  }

  async function loadReferenceData() {
    try {
      const [technicianRows, assetRows] = await Promise.all([
        fetchTechnicians().catch(() => []),
        fetchAssets().catch(() => []),
      ]);
      setTechnicians(Array.isArray(technicianRows) ? technicianRows : []);
      setAssets(Array.isArray(assetRows) ? assetRows : []);
    } catch {
      setTechnicians([]);
      setAssets([]);
    }
  }

  useEffect(() => {
    refresh();
    loadReferenceData();
  }, [ticketId]);

  useEffect(() => {
    if (ticket) {
      refreshSuggestions(ticket);
    }
  }, [ticket?.request_id]);

  async function runMutation(callback) {
    setIsMutating(true);
    setError('');
    try {
      const result = await callback();
      await refresh();
      return result;
    } catch (mutationError) {
      throw mutationError;
    } finally {
      setIsMutating(false);
    }
  }

  return {
    assets,
    error,
    isLoading,
    isMutating,
    refresh,
    suggestions,
    technicians,
    ticket,
    assign: (payload) => runMutation(() => assignTicket(ticketId, payload)),
    updateAsset: (payload) => runMutation(() => updateTicketAsset(ticketId, payload)),
    updateStatus: (payload) => runMutation(() => updateTicketStatus(ticketId, payload)),
    addComment: (payload) => runMutation(() => addTicketComment(ticketId, payload)),
    uploadAttachment: async ({ file, is_internal }) => {
      const content_base64 = await readFileAsDataUrl(file);
      return runMutation(() =>
        uploadTicketAttachment(ticketId, {
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          content_base64,
          is_internal: !!is_internal,
        })
      );
    },
    downloadAttachment: (attachmentId) => downloadTicketAttachment(ticketId, attachmentId),
  };
}
