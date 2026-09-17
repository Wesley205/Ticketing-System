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
  const responseMeasured = Number(stats?.response_sla_measured || 0);
  const responseMet = Number(stats?.response_sla_met || 0);
  const resolutionMeasured = Number(stats?.resolution_sla_measured || 0);
  const resolutionMet = Number(stats?.resolution_sla_met || 0);

  return (
    <div className="secure-dashboard-sla-grid">
      <article>
        <span>{formatPercent(stats?.response_sla_met_rate)}</span>
        <strong>Response SLA</strong>
        <small>{responseMeasured ? `${responseMet}/${responseMeasured} first responses on time` : 'No measured first responses'}</small>
      </article>
      <article>
        <span>{formatPercent(stats?.resolution_sla_met_rate)}</span>
        <strong>Resolution SLA</strong>
        <small>{resolutionMeasured ? `${resolutionMet}/${resolutionMeasured} resolutions on time` : 'No measured resolutions'}</small>
      </article>
      <article>
        <span>{formatHours(stats?.avg_resolution_hours)}</span>
        <strong>Avg Resolution Time</strong>
        <small>{stats?.avg_resolution_hours === null || stats?.avg_resolution_hours === undefined ? 'No resolved tickets' : 'Hours from submission to resolution'}</small>
      </article>
    </div>
  );
}
