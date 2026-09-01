import { useState } from 'react';
import { Button } from '../../../components/forms/Button.jsx';
import { FormField } from '../../../components/forms/FormField.jsx';
import { CommentThread } from '../../../components/status/CommentThread.jsx';
import { normalizeApiError } from '../../../lib/error-handling.js';

function mapComments(comments = []) {
  return comments.map((comment) => ({
    id: comment.comment_id,
    author: comment.author_name || 'System',
    body: comment.comment_body,
    timestamp: comment.created_at,
    is_internal: comment.is_internal,
  }));
}

export function TicketCommentsThread({
  comments = [],
  canComment = false,
  canAddInternalNote = false,
  onSubmit,
  isSubmitting = false,
}) {
  const [commentBody, setCommentBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!commentBody.trim()) {
      setErrorMessage('Enter a comment first.');
      return;
    }

    setErrorMessage('');

    try {
      await onSubmit({
        comment_body: commentBody.trim(),
        is_internal: canAddInternalNote ? isInternal : false,
      });
      setCommentBody('');
      setIsInternal(false);
    } catch (error) {
      setErrorMessage(normalizeApiError(error, 'Failed to add the comment.').message);
    }
  }

  return (
    <div className="ui-stack-md">
      {canComment ? (
        <form className="ui-stack-md" onSubmit={handleSubmit}>
          <FormField label="Add Comment" htmlFor="ticket-comment-body" error={errorMessage}>
            <textarea
              id="ticket-comment-body"
              className="ui-input"
              rows={3}
              placeholder="Add an update or question"
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
            />
          </FormField>
          <label className="ticket-checkbox">
            <input
              type="checkbox"
              checked={isInternal}
              disabled={!canAddInternalNote}
              onChange={(event) => setIsInternal(event.target.checked)}
            />
            <span>Internal ICT note</span>
          </label>
          <div className="ui-inline-actions">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </Button>
            <span className="react-copy ticket-muted-note">
              Internal notes are visible only to ICT officers, administrators, and the assigned technician.
            </span>
          </div>
        </form>
      ) : null}

      <div className="ticket-comment-list">
        {mapComments(comments).map((comment) => (
          <article key={comment.id} className="ui-thread-item">
            <div className="ui-thread-head">
              <strong>{comment.author}</strong>
              <small>{comment.timestamp ? new Date(comment.timestamp).toLocaleString('en-GB') : ''}</small>
            </div>
            {comment.is_internal ? <div className="ticket-flag">Internal Note</div> : null}
            <p>{comment.body}</p>
          </article>
        ))}
        {!comments.length ? <CommentThread comments={[]} /> : null}
      </div>
    </div>
  );
}
