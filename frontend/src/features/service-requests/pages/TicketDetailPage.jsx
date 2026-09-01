import { useParams } from 'react-router-dom';
import { Button } from '../../../components/forms/Button.jsx';
import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { PageHero } from '../../../components/layout/PageHero.jsx';
import { useToast } from '../../../hooks/useToast.js';
import { useTicketDetail } from '../hooks/useTicketDetail.js';
import { TicketAssignmentModal } from '../components/TicketAssignmentModal.jsx';
import { TicketDetail } from '../components/TicketDetail.jsx';
import { useState } from 'react';
import { assignTicket as saveAssignment } from '../services/service-requests-api.js';

export function TicketDetailPage() {
  const { ticketId } = useParams();
  const detailState = useTicketDetail(ticketId);
  const { showToast } = useToast();
  const [assignmentOpen, setAssignmentOpen] = useState(false);

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
    <div className="ui-stack-lg">
      <PageHero
        eyebrow="Phase 4"
        title="Ticket Detail"
        description="Standalone React ticket view for deep links, comments, attachments, assignment, and history."
        meta={[detailState.ticket?.ticket_number || `#${ticketId}`]}
      />

      {detailState.error ? (
        <ErrorState title="Ticket detail unavailable" description={detailState.error} onRetry={detailState.refresh} />
      ) : detailState.isLoading ? (
        <LoadingState description="Loading ticket detail..." />
      ) : (
        <TicketDetail
          ticket={detailState.ticket}
          suggestions={detailState.suggestions}
          assets={detailState.assets}
          onAssetSave={async (payload) => {
            await detailState.updateAsset(payload);
            showToast({ tone: 'success', title: 'Asset link updated' });
          }}
          onAssignOpen={() => setAssignmentOpen(true)}
          onStatusSubmit={async (payload) => {
            await detailState.updateStatus(payload);
            showToast({ tone: 'success', title: 'Status updated' });
          }}
          onCommentSubmit={async (payload) => {
            await detailState.addComment(payload);
            showToast({ tone: 'success', title: 'Comment posted' });
          }}
          onAttachmentUpload={async (payload) => {
            await detailState.uploadAttachment(payload);
            showToast({ tone: 'success', title: 'Attachment uploaded' });
          }}
          onAttachmentDownload={handleDownloadAttachment}
          isMutating={detailState.isMutating}
        />
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

      <a href="/service-requests">
        <Button variant="secondary">Back to service desk</Button>
      </a>
    </div>
  );
}
