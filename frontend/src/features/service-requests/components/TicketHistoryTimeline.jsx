import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { TimelineList } from '../../../components/status/TimelineList.jsx';

function mapHistory(history = []) {
  return history.map((entry) => ({
    id: entry.history_id || `${entry.event_type}-${entry.created_at}`,
    title: String(entry.event_type || 'event').replace(/_/g, ' '),
    description: [
      entry.from_status || entry.to_status
        ? `${entry.from_status || '-'} -> ${entry.to_status || '-'}`
        : '',
      String(entry.details || '').replace(/\btechnician_id\s+(\d+)/gi, 'technician #$1'),
    ]
      .filter(Boolean)
      .join(' | '),
    timestamp: entry.created_at,
  }));
}

export function TicketHistoryTimeline({ history = [] }) {
  if (!history.length) {
    return <EmptyState title="No timeline entries yet." description="Ticket lifecycle and audit events will appear here." />;
  }

  return <TimelineList items={mapHistory(history)} />;
}
