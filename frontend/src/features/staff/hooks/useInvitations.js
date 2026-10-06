import { useEffect, useState } from 'react';
import {
  INVITATION_STATUSES,
  createInvitation,
  fetchInvitations,
  resendInvitation,
  revokeInvitation,
} from '../services/staff-api.js';

export function useInvitations({ enabled = true } = {}) {
  const [invitations, setInvitations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(enabled);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadInvitations(nextStatus = statusFilter) {
    if (!enabled) {
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const rows = await fetchInvitations({ status: nextStatus });
      setInvitations(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setError(loadError.message || 'Failed to load invitations.');
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadInvitations(statusFilter);
  }, [enabled, statusFilter]);

  async function submitInvitation(payload) {
    setIsSubmitting(true);
    try {
      const created = await createInvitation(payload);
      await loadInvitations(statusFilter);
      return created;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function revoke(invitationId) {
    setIsSubmitting(true);
    try {
      const result = await revokeInvitation(invitationId);
      await loadInvitations(statusFilter);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resend(invitationId) {
    setIsSubmitting(true);
    setError('');
    try {
      const result = await resendInvitation(invitationId);
      await loadInvitations(statusFilter);
      return result;
    } catch (resendError) {
      setError(resendError.message || 'Failed to resend invitation email.');
      throw resendError;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    error,
    invitationStatuses: INVITATION_STATUSES,
    invitations,
    isLoading,
    isSubmitting,
    loadInvitations,
    revoke,
    resend,
    setStatusFilter,
    statusFilter,
    submitInvitation,
  };
}
