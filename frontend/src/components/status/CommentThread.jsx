import { formatDateTime } from '../../lib/formatting.js';

export function CommentThread({ comments = [] }) {
  return (
    <div className="ui-thread">
      {comments.map((comment, index) => (
        <article key={comment.id || index} className="ui-thread-item">
          <div className="ui-thread-head">
            <strong>{comment.author}</strong>
            {comment.timestamp ? <small>{formatDateTime(comment.timestamp)}</small> : null}
          </div>
          <p>{comment.body}</p>
        </article>
      ))}
    </div>
  );
}
