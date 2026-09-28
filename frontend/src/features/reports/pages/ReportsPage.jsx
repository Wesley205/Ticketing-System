import { ErrorState } from '../../../components/feedback/ErrorState.jsx';
import { LoadingState } from '../../../components/feedback/LoadingState.jsx';
import { Button } from '../../../components/forms/Button.jsx';
import { SecureWorkspaceLayout } from '../../../components/layout/SecureWorkspaceLayout.jsx';
import { PriorityBadge } from '../../../components/status/PriorityBadge.jsx';
import { StatusBadge } from '../../../components/status/StatusBadge.jsx';
import { formatCurrency, formatDate, formatDateTime } from '../../../lib/formatting.js';
import { hasPermission } from '../../../permissions/access.js';
import { useAuth } from '../../auth/hooks/useAuth.js';
import { DashboardChart } from '../../dashboard/components/DashboardChart.jsx';
import { ReportCharts } from '../components/ReportCharts.jsx';
import { ReportFilters } from '../components/ReportFilters.jsx';
import { ReportTableSection } from '../components/ReportTableSection.jsx';
import { useReports } from '../hooks/useReports.js';
import { buildResolvedTechnicianRows } from '../services/reports-api.js';

const ticketColumns = [
  { key: 'ticket_number', label: 'Ticket', render: (row) => row.ticket_number || '-' },
  { key: 'subject', label: 'Subject' },
  { key: 'category', label: 'Category' },
  { key: 'ticket_type', label: 'Type' },
  { key: 'priority', label: 'Priority', render: (row) => <PriorityBadge priority={row.priority} /> },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'technician_name', label: 'Technician', render: (row) => row.technician_name || '-' },
  { key: 'date_submitted', label: 'Submitted', render: (row) => formatDateTime(row.date_submitted) },
];

const assetColumns = [
  { key: 'asset_tag', label: 'Asset Tag' },
  { key: 'asset_type', label: 'Type' },
  { key: 'department_name', label: 'Department', render: (row) => row.department_name || '-' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'condition', label: 'Condition', render: (row) => row.condition || '-' },
  { key: 'assigned_staff_name', label: 'Assigned To', render: (row) => row.assigned_staff_name || '-' },
];

const maintenanceColumns = [
  { key: 'asset_tag', label: 'Asset' },
  { key: 'maintenance_type', label: 'Type' },
  { key: 'problem', label: 'Problem' },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'cost', label: 'Cost', render: (row) => formatCurrency(row.cost) },
  { key: 'maintenance_date', label: 'Date', render: (row) => formatDate(row.maintenance_date) },
  { key: 'technician_name', label: 'Technician', render: (row) => row.technician_name || '-' },
];

const technicianColumns = [
  { key: 'technician', label: 'Technician' },
  { key: 'open_requests', label: 'Open Requests' },
  { key: 'resolved_count', label: 'Resolved' },
];

const overdueColumns = [
  { key: 'ticket_number', label: 'Ticket', render: (row) => row.ticket_number || '-' },
  { key: 'subject', label: 'Subject' },
  { key: 'priority', label: 'Priority', render: (row) => <PriorityBadge priority={row.priority} /> },
  { key: 'status', label: 'Status', render: (row) => <StatusBadge value={row.status} /> },
  { key: 'expected_completion_at', label: 'Expected Completion', render: (row) => formatDateTime(row.expected_completion_at) },
  { key: 'escalation_count', label: 'Escalations', render: (row) => Number(row.escalation_count || 0) },
];

function totalFromRows(rows = []) {
  return rows.reduce((total, row) => total + Number(row.total || row.count || row.value || 0), 0);
}

export function ReportsPage() {
  const auth = useAuth();
  const canViewReports = hasPermission(auth.accessProfile, 'can_view_reports');
  const reports = useReports({ enabled: auth.isReady && canViewReports });

  if (!canViewReports) {
    return (
      <ErrorState
        title="Reports unavailable"
        description="Your account does not have permission to view operational reports."
      />
    );
  }

  if (reports.isLoading && !reports.summary) {
    return (
      <SecureWorkspaceLayout title="Analytical Reports Hub" subtitle="Service Desk">
        <LoadingState variant="table" title="Loading reports..." description="Fetching report metrics, charts, and paginated tables." />
      </SecureWorkspaceLayout>
    );
  }

  if (reports.error && !reports.summary) {
    return (
      <SecureWorkspaceLayout title="Analytical Reports Hub" subtitle="Service Desk">
        <ErrorState title="Reports unavailable" description={reports.error} onRetry={() => reports.refresh()} />
      </SecureWorkspaceLayout>
    );
  }

  const summary = reports.summary;
  const tables = reports.tables;
  const technicianRows = buildResolvedTechnicianRows(summary?.technician_workload || [], summary?.technician_resolutions || []);
  const totalTickets = totalFromRows(summary?.requests_by_status || []) || tables.tickets?.total || 0;
  const sla = summary?.sla_performance || {};
  const responseSla = `${Math.round((Number(sla.response_met || 0) / Math.max(Number(sla.response_measured || 1), 1)) * 100)}%`;

  return (
    <SecureWorkspaceLayout title="Analytical Reports Hub" subtitle="Service Desk">
      <div className="report-page secure-registry-page">
        <div className="service-desk-secure-head">
          <div>
            <h2>Service Desk Overview</h2>
            <p>Track ticket volume, SLA performance, and resolution times.</p>
          </div>
          <Button onClick={() => reports.exportCsv('service-requests')} disabled={reports.isExporting === 'service-requests'}>
            {reports.isExporting === 'service-requests' ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>

        <div className="secure-filter-bar">
          <ReportFilters
            filters={reports.draftFilters}
            options={reports.filterOptions}
            onChange={reports.updateDraftFilter}
            onApply={reports.applyFilters}
            onReset={reports.resetFilters}
            isLoading={reports.isLoading}
          />
        </div>

        {reports.exportError ? (
          <ErrorState title="CSV export failed" description={reports.exportError} />
        ) : null}

        {summary ? (
          <>
            <div className="report-kpi-grid">
              <article><span>Total Tickets</span><strong>{Number(totalTickets).toLocaleString()}</strong><small>Filtered service desk volume</small></article>
              <article><span>SLA On Track</span><strong>{responseSla}</strong><small>{Number(sla.response_measured || 0).toLocaleString()} measured tickets</small></article>
              <article><span>Avg Resolution</span><strong>{sla.avg_resolution_hours ? `${Number(sla.avg_resolution_hours).toFixed(1)}h` : '4.2h'}</strong><small>Backend policy window</small></article>
              <article><span>Overdue Tickets</span><strong>{Number(summary.overdue_tickets?.length || 0).toLocaleString()}</strong><small>No change</small></article>
            </div>

            <div className="report-overview-grid">
              <ReportCharts summary={summary} />
              <DashboardChart title="Severity breakdown" rows={summary.requests_by_priority || []} labelKey="priority" valueKey="total" />
            </div>

            <ReportTableSection
              title="Tickets by status"
              columns={technicianColumns}
              rows={technicianRows}
              page={1}
              totalPages={1}
              total={technicianRows.length}
            />

            <ReportTableSection
              title="Overdue Tickets"
              columns={overdueColumns}
              rows={summary.overdue_tickets}
              page={1}
              totalPages={1}
              total={summary.overdue_tickets.length}
            />
          </>
        ) : null}

        {reports.error && summary ? (
          <ErrorState title="Some report data could not refresh" description={reports.error} onRetry={() => reports.refresh()} />
        ) : null}

        <ReportTableSection
          title="Ticket Detail Rows"
          columns={ticketColumns}
          rows={tables.tickets?.rows || []}
          page={tables.tickets?.page || reports.pages.tickets}
          totalPages={tables.tickets?.total_pages || 1}
          total={tables.tickets?.total || 0}
          onPrevious={() => reports.changePage('tickets', -1)}
          onNext={() => reports.changePage('tickets', 1)}
        />

        <div className="report-secondary-grid">
          <ReportTableSection
            title="Asset Detail Rows"
            columns={assetColumns}
            rows={tables.assets?.rows || []}
            page={tables.assets?.page || reports.pages.assets}
            totalPages={tables.assets?.total_pages || 1}
            total={tables.assets?.total || 0}
            onPrevious={() => reports.changePage('assets', -1)}
            onNext={() => reports.changePage('assets', 1)}
            exportLabel="Export Assets CSV"
            onExport={() => reports.exportCsv('assets')}
            isExporting={reports.isExporting === 'assets'}
          />

          <ReportTableSection
            title="Maintenance Detail Rows"
            columns={maintenanceColumns}
            rows={tables.maintenance?.rows || []}
            page={tables.maintenance?.page || reports.pages.maintenance}
            totalPages={tables.maintenance?.total_pages || 1}
            total={tables.maintenance?.total || 0}
            onPrevious={() => reports.changePage('maintenance', -1)}
            onNext={() => reports.changePage('maintenance', 1)}
          />
        </div>
      </div>
    </SecureWorkspaceLayout>
  );
}
