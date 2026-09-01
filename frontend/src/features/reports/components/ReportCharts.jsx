import { DashboardChart } from '../../dashboard/components/DashboardChart.jsx';

export function ReportCharts({ summary }) {
  return (
    <div className="dashboard-chart-grid">
      <DashboardChart title="Assets by Status" rows={summary.assets_by_status} labelKey="status" />
      <DashboardChart title="Assets by Type" rows={summary.assets_by_type} labelKey="asset_type" />
      <DashboardChart title="Requests by Priority" rows={summary.requests_by_priority} labelKey="priority" />
      <DashboardChart title="Requests by Status" rows={summary.requests_by_status} labelKey="status" />
      <DashboardChart title="Requests by Category" rows={summary.requests_by_category} labelKey="category" />
      <DashboardChart title="Monthly Maintenance Cost" rows={summary.monthly_maintenance} labelKey="month" valueKey="total_cost" />
    </div>
  );
}
