const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = [
  { label: 'staff', identifier: 'ngozi.umeh', canViewReports: false },
  { label: 'technician', identifier: 'chinedu.obi', canViewReports: false },
  { label: 'ict_officer', identifier: 'ibrahim.musa', canViewReports: true },
  { label: 'admin', identifier: 'admin', canViewReports: true },
];

function resolveErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.error || payload.message || fallback;
}

async function api(path, { method = 'GET', token, body, expect = [200] } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!expect.includes(response.status)) {
    throw new Error(`${method} ${path} -> ${response.status}: ${resolveErrorMessage(payload, response.statusText)}`);
  }

  return { status: response.status, payload };
}

async function login(identifier) {
  const { payload } = await api('/auth/login', {
    method: 'POST',
    body: { identifier, password: PASSWORD },
  });

  return payload;
}

function summarizeRows(payload) {
  return {
    page: Number(payload.page || 0),
    page_size: Number(payload.page_size || 0),
    total: Number(payload.total || 0),
    rows: Array.isArray(payload.rows) ? payload.rows.length : 0,
  };
}

function summarizeSummary(payload) {
  return {
    asset_status_rows: Array.isArray(payload.assets_by_status) ? payload.assets_by_status.length : 0,
    request_status_rows: Array.isArray(payload.requests_by_status) ? payload.requests_by_status.length : 0,
    technician_workload_rows: Array.isArray(payload.technician_workload) ? payload.technician_workload.length : 0,
    overdue_tickets: Array.isArray(payload.overdue_tickets) ? payload.overdue_tickets.length : 0,
    filters_applied: payload.filters_applied || {},
  };
}

async function main() {
  const summary = {
    checked_at: new Date().toISOString(),
    api_base: API_BASE,
    accounts_verified: [],
  };

  for (const account of accounts) {
    const session = await login(account.identifier);
    const token = session.token;
    const { payload: me } = await api('/auth/me', { token });
    const expected = account.canViewReports ? [200] : [403];

    const filtersResult = await api('/reports/filters', { token, expect: expected });
    const summaryResult = await api('/reports/summary?date_from=2026-01-01&date_to=2026-12-31&category=Network', { token, expect: expected });
    const ticketsResult = await api('/reports/tickets?page=1&page_size=10&date_from=2026-01-01&date_to=2026-12-31', { token, expect: expected });
    const ticketsPageTwoResult = await api('/reports/tickets?page=2&page_size=10&date_from=2026-01-01&date_to=2026-12-31', { token, expect: expected });
    const assetsResult = await api('/reports/assets?page=1&page_size=10&date_from=2026-01-01&date_to=2026-12-31', { token, expect: expected });
    const maintenanceResult = await api('/reports/maintenance?page=1&page_size=10&date_from=2026-01-01&date_to=2026-12-31', { token, expect: expected });
    const assetExportResult = await api('/reports/export/assets.csv?date_from=2026-01-01&date_to=2026-12-31', { token, expect: expected });
    const requestExportResult = await api('/reports/export/service-requests.csv?date_from=2026-01-01&date_to=2026-12-31', { token, expect: expected });
    let departmentFilterApplied = null;
    let technicianFilterApplied = null;

    if (account.canViewReports) {
      const firstDepartmentId = filtersResult.payload.departments?.[0]?.department_id;
      const firstTechnicianId = filtersResult.payload.technicians?.[0]?.user_id;

      if (firstDepartmentId) {
        const departmentFiltered = await api(`/reports/summary?department_id=${firstDepartmentId}`, { token });
        departmentFilterApplied = departmentFiltered.payload.filters_applied;
      }

      if (firstTechnicianId) {
        const technicianFiltered = await api(`/reports/summary?technician_id=${firstTechnicianId}`, { token });
        technicianFilterApplied = technicianFiltered.payload.filters_applied;
      }
    }

    summary.accounts_verified.push({
      account: account.label,
      role: me.role,
      user_id: me.user_id,
      report_filters_access: filtersResult.status,
      report_summary_access: summaryResult.status,
      ticket_rows_access: ticketsResult.status,
      asset_rows_access: assetsResult.status,
      maintenance_rows_access: maintenanceResult.status,
      asset_csv_export_access: assetExportResult.status,
      request_csv_export_access: requestExportResult.status,
      report_summary: account.canViewReports ? summarizeSummary(summaryResult.payload) : null,
      department_filter_applied: departmentFilterApplied,
      technician_filter_applied: technicianFilterApplied,
      tickets_page_1: account.canViewReports ? summarizeRows(ticketsResult.payload) : null,
      tickets_page_2: account.canViewReports ? summarizeRows(ticketsPageTwoResult.payload) : null,
      assets_page_1: account.canViewReports ? summarizeRows(assetsResult.payload) : null,
      maintenance_page_1: account.canViewReports ? summarizeRows(maintenanceResult.payload) : null,
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[reports-live-check] Failed:', error.message);
  process.exitCode = 1;
});
