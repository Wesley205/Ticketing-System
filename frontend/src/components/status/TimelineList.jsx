import { formatDateTime } from '../../lib/formatting.js';

export function TimelineList({ items = [] }) {
  return (
    <div className="ui-timeline">
      {items.map((item, index) => (
        <div key={item.id || index} className="ui-timeline-item">
          <strong>{item.title}</strong>
          {item.description ? <p>{item.description}</p> : null}
          {item.timestamp ? <small>{formatDateTime(item.timestamp)}</small> : null}
        </div>
      ))}
    </div>
  );
}
