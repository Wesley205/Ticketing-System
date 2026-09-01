import { formatDateTime } from '../../lib/formatting.js';

export function AttachmentList({ attachments = [] }) {
  return (
    <div className="ui-attachment-list">
      {attachments.map((attachment, index) => (
        <div key={attachment.id || index} className="ui-attachment-item">
          <strong>{attachment.fileName}</strong>
          <small>
            {attachment.sizeLabel || '-'}
            {attachment.timestamp ? ` | ${formatDateTime(attachment.timestamp)}` : ''}
          </small>
        </div>
      ))}
    </div>
  );
}
