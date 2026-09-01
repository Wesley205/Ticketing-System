import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { AttachmentList } from '../../../components/status/AttachmentList.jsx';
import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';

function mapAttachments(attachments = []) {
  return attachments.map((attachment) => ({
    id: attachment.attachment_id,
    fileName: attachment.file_name,
    sizeLabel: `${attachment.file_size_bytes || 0} bytes`,
    timestamp: attachment.created_at,
    is_internal: attachment.is_internal,
    uploadedByName: attachment.uploaded_by_name || 'System',
  }));
}

export function TicketAttachments({
  attachments = [],
  canUpload = false,
  canAddInternal = false,
  onUpload,
  onDownload,
  isSubmitting = false,
}) {
  const [file, setFile] = useState(null);
  const [isInternal, setIsInternal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) {
      setErrorMessage('Choose a file first.');
      return;
    }

    setErrorMessage('');

    try {
      await onUpload({ file, is_internal: canAddInternal ? isInternal : false });
      setFile(null);
      setIsInternal(false);
      const input = document.getElementById('ticket-attachment-input');
      if (input) input.value = '';
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to upload the attachment.').message);
    }
  }

  return (
    <div className="ui-stack-md">
      {canUpload ? (
        <form className="ui-stack-md" onSubmit={handleUpload}>
          <input
            id="ticket-attachment-input"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
          <label className="ticket-checkbox">
            <input
              type="checkbox"
              checked={isInternal}
              disabled={!canAddInternal}
              onChange={(event) => setIsInternal(event.target.checked)}
            />
            <span>Internal attachment</span>
          </label>
          {errorMessage ? <p className="ui-field-error">{errorMessage}</p> : null}
          <div className="ui-inline-actions">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : 'Upload Attachment'}
            </Button>
            <span className="react-copy ticket-muted-note">
              Allowed types: PDF, PNG, JPG, WEBP, TXT, DOCX, XLSX.
            </span>
          </div>
        </form>
      ) : null}

      {attachments.length ? (
        <div className="ui-stack-md">
          {mapAttachments(attachments).map((attachment) => (
            <div key={attachment.id} className="ui-attachment-item">
              {attachment.is_internal ? <div className="ticket-flag">Internal Attachment</div> : null}
              <strong>{attachment.fileName}</strong>
              <small>
                {attachment.uploadedByName} | {attachment.sizeLabel} | {attachment.timestamp ? new Date(attachment.timestamp).toLocaleString('en-GB') : '-'}
              </small>
              <div className="ui-inline-actions">
                <button type="button" className="ticket-link-button" onClick={() => onDownload(attachment.id, attachment.fileName)}>
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No attachments yet." description="Upload files to keep ticket evidence and technical artifacts together." />
      )}
    </div>
  );
}
