import { EmptyState } from '../../../components/feedback/EmptyState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { formatDateTime } from '../../../lib/formatting.js';
import { getChecklistItems } from '../services/maintenance-api.js';

export function ScheduleList({ schedules = [], canManage = false, onEdit }) {
  if (!schedules.length) {
    return <EmptyState variant="search" title="No maintenance schedules" description="No schedules matched the current filters." />;
  }

  return (
    <div className="maintenance-schedule-list">
      {schedules.map((schedule) => {
        const checklist = getChecklistItems(schedule);
        return (
          <article className="maintenance-schedule-card" key={schedule.schedule_id}>
            <div className="maintenance-schedule-head">
              <div>
                <h3>{schedule.title}</h3>
                <p>{schedule.asset_tag} - {schedule.maintenance_type}</p>
              </div>
              <span className={`ui-chip ${schedule.is_active === false ? 'ui-chip-muted' : ''}`}>
                {schedule.is_active === false ? 'Inactive' : 'Active'}
              </span>
            </div>
            {schedule.description ? <p className="react-copy">{schedule.description}</p> : null}
            <div className="maintenance-schedule-meta">
              <span>Due {formatDateTime(schedule.next_due_at)}</span>
              <span>Every {Number(schedule.frequency_value || 0)} {schedule.frequency_unit}</span>
              <span>Reminder {Number(schedule.reminder_days_before || 0)} day(s) before</span>
              <span>{schedule.technician_name || 'Unassigned technician'}</span>
            </div>
            {checklist.length ? (
              <ul className="maintenance-checklist">
                {checklist.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
            {canManage ? (
              <div className="ui-inline-actions">
                <Button variant="secondary" size="sm" onClick={() => onEdit(schedule)}>Edit Schedule</Button>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
