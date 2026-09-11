import { formatHours, formatPercent } from '../services/dashboard-api.js';

export function TechnicianCapacityPanel({ rows = [], capacityLimit = 15 }) {
  const visibleRows = rows.length ? rows : [
    { technician: 'A. Ibrahim', open_requests: 11, resolved_requests: 3 },
    { technician: 'Sarah Chen', open_requests: 10, resolved_requests: 7 },
    { technician: 'John Mwangi', open_requests: 9, resolved_requests: 5 },
    { technician: 'Elena Rostova', open_requests: 6, resolved_requests: 4 },
  ];

  return (
    <section className="secure-dashboard-panel">
      <div className="secure-dashboard-panel-head">
        <h3>Technician Workload</h3>
        <span>Capacity Limit: {capacityLimit}</span>
      </div>
      <div className="secure-dashboard-workload-list">
        {visibleRows.slice(0, 4).map((row) => {
          const open = Number(row.open_requests || row.open || 0);
          const percent = Math.min(100, Math.round((open / capacityLimit) * 100));
          return (
            <div className="secure-dashboard-workload-row" key={row.technician || row.technician_name}>
              <strong>{row.technician || row.technician_name}</strong>
              <span><i style={{ width: `${percent}%` }} /></span>
              <small>{open} open</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function SlaSummaryCards({ stats }) {
  return (
    <div className="secure-dashboard-sla-grid">
      <article>
        <span>{formatPercent(stats?.response_sla_met_rate)}</span>
        <strong>Response SLA</strong>
        <small>Target: 95% on-time</small>
      </article>
      <article>
        <span>{formatPercent(stats?.resolution_sla_met_rate)}</span>
        <strong>Resolution SLA</strong>
        <small>Target: 90% on-time</small>
      </article>
      <article>
        <span>{formatHours(stats?.avg_resolution_hours)}</span>
        <strong>Avg Resolution Time</strong>
        <small>Hours</small>
      </article>
    </div>
  );
}
