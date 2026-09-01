import { TicketCommentsThread } from '../../service-requests/components/TicketCommentsThread.jsx';

export function TechnicianComments({
  comments = [],
  canAddInternalNote = true,
  onSubmit,
  isSubmitting = false,
}) {
  return (
    <TicketCommentsThread
      comments={comments}
      canComment
      canAddInternalNote={canAddInternalNote}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}
