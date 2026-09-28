import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { TicketAssignmentModal } from '../components/TicketAssignmentModal.jsx';
import { ServiceRequestFullDetail } from '../components/ServiceRequestFullDetail.jsx';
import { useTicketDetail } from '../hooks/useTicketDetail.js';
import { assignTicket as saveAssignment, isOperationalServiceDeskRole } from '../services/service-requests-api.js';

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const auth = useAuth();
  const detailState = useTicketDetail(ticketId);
  const { showToast } = useToast();
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const isOperational = isOperationalServiceDeskRole(auth.user?.role);

  if (auth.user?.role === 'technician') {
    return <Navigate to={`/technician/work/ticket/${ticketId}`} replace />;
  }

  async function handleDownloadAttachment(attachmentId, fileName) {
    const blob = await detailState.downloadAttachment(attachmentId);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'attachment';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <SecureWorkspaceLayout title={isOperational ? 'ICT Service Desk Operations Control' : 'Staff Access Portal'} subtitle={isOperational ? 'Tactical Secure Control' : 'ICT Service Hub'}>
      {detailState.error ? (
        <ErrorState title="Ticket detail unavailable" description={detailState.error} onRetry={detailState.refresh} />
      ) : detailState.isLoading ? (
        <LoadingState variant="detail" description="Loading ticket detail..." />
      ) : detailState.ticket ? (
        <ServiceRequestFullDetail
          ticket={detailState.ticket}
          suggestions={detailState.suggestions}
          assets={detailState.assets}
          isAdmin={auth.user?.role === 'admin'}
          isOperational={isOperational}
          onAssignOpen={() => setAssignmentOpen(true)}
          onStatusSubmit={async (payload) => {
            try {
              await detailState.updateStatus(payload);
              showToast({ tone: 'success', title: 'Status updated' });
            } catch (error) {
              showToast({ tone: 'error', title: 'Status update failed', message: error.message || 'The ticket status could not be updated.' });
            }
          }}
          onCommentSubmit={async (payload) => {
            await detailState.addComment(payload);
            showToast({ tone: 'success', title: payload.is_internal ? 'Internal note posted' : 'Reply posted' });
          }}
          onAttachmentUpload={async (payload) => {
            await detailState.uploadAttachment(payload);
            showToast({ tone: 'success', title: 'Attachment uploaded' });
          }}
          onAttachmentDownload={handleDownloadAttachment}
          onAssetSave={isOperational ? async (payload) => {
            await detailState.updateAsset(payload);
            showToast({ tone: 'success', title: 'Asset link updated' });
          } : null}
          isMutating={detailState.isMutating}
        />
      ) : (
        <ErrorState variant="not-found" title="Ticket not found" description="This service request is no longer available or is outside your authorized scope." />
      )}

      <TicketAssignmentModal
        open={assignmentOpen}
        ticket={detailState.ticket}
        technicians={detailState.technicians}
        onClose={() => setAssignmentOpen(false)}
        onSubmit={async (payload) => {
          await saveAssignment(ticketId, payload);
          await detailState.refresh();
          showToast({ tone: 'success', title: 'Assignment saved' });
        }}
      />
    </SecureWorkspaceLayout>
  );
}
