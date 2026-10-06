import { useState } from 'react';
import { ImageGallery } from '../../../components/media/ImageGallery.jsx';
import { formatBytes, isSupportedImageType } from '../../../lib/media-files.js';
import { normalizeApiError } from '../../../lib/error-handling.js';

const MAX_TICKET_IMAGES = 3;

function mapAttachments(attachments = []) {
  return attachments.map((attachment) => ({
    id: attachment.attachment_id,
    fileName: attachment.file_name,
    sizeLabel: formatBytes(attachment.file_size_bytes),
    mimeType: attachment.mime_type,
    caption: attachment.file_name,
    altText: attachment.file_name,
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
  onLoadImage,
  isSubmitting = false,
}) {
  const [isInternal, setIsInternal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const mappedAttachments = mapAttachments(attachments);
  const imageAttachments = mappedAttachments.filter((attachment) => isSupportedImageType(attachment.mimeType));
  const documentAttachments = mappedAttachments.filter((attachment) => !isSupportedImageType(attachment.mimeType));
  const imageSlotsRemaining = Math.max(0, MAX_TICKET_IMAGES - imageAttachments.length);

  async function handleAddImages(files) {
    setErrorMessage('');

    if (files.some((file) => !isSupportedImageType(file.type))) {
      setErrorMessage('Only JPG, PNG, or WEBP images can be added.');
      return;
    }
    if (files.length > imageSlotsRemaining) {
      setErrorMessage(`You can add ${imageSlotsRemaining} more image${imageSlotsRemaining === 1 ? '' : 's'}.`);
      return;
    }

    try {
      for (const image of files) {
        await onUpload({ file: image, is_internal: canAddInternal ? isInternal : false });
      }
      setIsInternal(false);
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to upload the attachment.').message);
    }
  }

  return (
    <div className="ui-stack-md">
      {canUpload && canAddInternal ? (
        <div className="media-gallery-options">
          <label className="ticket-checkbox">
            <input
              type="checkbox"
              checked={isInternal}
              disabled={!canAddInternal}
              onChange={(event) => setIsInternal(event.target.checked)}
            />
            <span>Internal attachment</span>
          </label>
          <span className="react-copy ticket-muted-note">Mark new images as visible only to authorized ICT users.</span>
        </div>
      ) : null}

      {errorMessage ? <p className="ui-field-error" role="alert">{errorMessage}</p> : null}

      <ImageGallery
        title="Image evidence"
        emptyTitle="No evidence images yet."
        emptyDescription={canUpload ? 'Add screenshots or photos that give more context to this ticket.' : 'Images added to this ticket will appear here.'}
        items={imageAttachments}
        loadImage={onLoadImage || onDownload}
        onDownload={(attachment) => onDownload(attachment.id, attachment.fileName)}
        onAddImages={canUpload ? handleAddImages : undefined}
        remainingSlots={imageSlotsRemaining}
        isAdding={isSubmitting}
      />

      {canUpload ? (
        <span className="react-copy ticket-muted-note">
          JPG, PNG, or WEBP. {imageSlotsRemaining} of {MAX_TICKET_IMAGES} image slots available.
        </span>
      ) : null}

      {documentAttachments.length ? (
        <div className="ui-stack-md">
          {documentAttachments.map((attachment) => (
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
      ) : null}

    </div>
  );
}
