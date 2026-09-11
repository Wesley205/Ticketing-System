import { EmptyState } from '../../../components/feedback/EmptyState.jsx';

function getTotal(rows, valueKey) {
  return rows.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);
}

export function DashboardChart({
  title,
  rows = [],
  labelKey,
  valueKey = 'total',
}) {
  const total = getTotal(rows, valueKey);

  return (
    <section className="react-panel dashboard-chart-panel">
      <div className="ui-panel-head">
        <h3>{title}</h3>
        <span className="ui-chip">{total} total</span>
      </div>

      {rows.length ? (
        <div className="dashboard-chart-bars">
          {rows.map((row) => {
            const value = Number(row[valueKey] || 0);
            const percent = total ? Math.round((value / total) * 100) : 0;
            const label = row[labelKey] || 'Unmapped';

            return (
              <div className="dashboard-chart-row" key={`${label}-${value}`}>
                <div className="dashboard-chart-label">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
                <div className="dashboard-chart-track" aria-hidden="true">
                  <span style={{ width: `${Math.max(percent, value ? 4 : 0)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState variant="search" title="No chart data" description="No records matched the current dashboard scope." />
      )}
    </section>
  );
}
