import { useEffect, useState } from 'react';
import {
  addTicketComment,
  assignTicket,
  downloadTicketAttachment,
  fetchAssets,
  fetchAssignmentHistory,
  fetchRoutingSuggestions,
  fetchTechnicians,
  fetchTicketDetail,
  fetchTicketSuggestions,
  updateTicketAsset,
  updateTicketStatus,
  uploadTicketAttachment,
} from '../services/service-requests-api.js';
import { imageFileToUploadPayload } from '../../../lib/media-files.js';

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
        fetchRoutingSuggestions(ticketId).catch(() => fetchTechnicians().catch(() => [])),
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
      return runMutation(() =>
        imageFileToUploadPayload(file, { is_internal: !!is_internal })
          .then((payload) => uploadTicketAttachment(ticketId, payload))
      );
    },
    downloadAttachment: (attachmentId) => downloadTicketAttachment(ticketId, attachmentId),
  };
}
