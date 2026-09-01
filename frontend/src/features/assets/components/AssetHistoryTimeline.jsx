import { TimelineList } from '../../../components/status/TimelineList.jsx';

function mapAssignmentHistory(entries = []) {
  return entries.map((entry) => ({
    id: `assignment-${entry.assignment_id}`,
    title: entry.is_active
      ? `Assigned to ${entry.assigned_user_name || 'Unknown user'}`
      : `Returned from ${entry.assigned_user_name || 'Unknown user'}`,
    description: [
      entry.assigned_department_name ? `Department: ${entry.assigned_department_name}` : null,
      entry.assignment_notes || null,
      entry.return_notes || null,
      entry.returned_condition ? `Returned condition: ${entry.returned_condition}` : null,
    ].filter(Boolean).join(' | '),
    timestamp: entry.returned_at || entry.assigned_at,
  }));
}

function mapStatusHistory(entries = []) {
  return entries.map((entry) => ({
    id: `status-${entry.asset_status_history_id}`,
    title: `${entry.previous_status || '-'} -> ${entry.next_status || '-'}`,
    description: [entry.actor_name, entry.reason].filter(Boolean).join(' | '),
    timestamp: entry.created_at,
  }));
}

export function AssetHistoryTimeline({ assignmentHistory = [], statusHistory = [] }) {
  const items = [
    ...mapAssignmentHistory(assignmentHistory),
    ...mapStatusHistory(statusHistory),
  ].sort((left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0));

  return <TimelineList items={items} />;
}
