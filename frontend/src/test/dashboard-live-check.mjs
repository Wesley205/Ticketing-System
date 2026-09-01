const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = [
  { label: 'staff', identifier: 'ngozi.umeh', canUseReports: false },
  { label: 'technician', identifier: 'chinedu.obi', canUseReports: false },
  { label: 'ict_officer', identifier: 'ibrahim.musa', canUseReports: true },
  { label: 'admin', identifier: 'admin', canUseReports: true },
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

function summarizeStats(stats) {
  return {
    total_requests: Number(stats.total_requests || 0),
    total_assets: Number(stats.total_assets || 0),
    maintenance_total_records: Number(stats.maintenance_total_records || 0),
    ticket_status_rows: Array.isArray(stats.tickets_by_status) ? stats.tickets_by_status.length : 0,
    asset_status_rows: Array.isArray(stats.assets_by_status) ? stats.assets_by_status.length : 0,
    technician_workload_rows: Array.isArray(stats.technician_workload) ? stats.technician_workload.length : 0,
    filters_applied: stats.filters_applied || {},
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

    const { payload: baseStats } = await api('/dashboard/stats', { token });
    const { payload: filteredStats } = await api('/dashboard/stats?date_from=2026-01-01&date_to=2026-12-31&category=Network', { token });

    const filtersResult = await api('/reports/filters', {
      token,
      expect: account.canUseReports ? [200] : [403],
    });

    const exportResult = await api('/reports/export/service-requests.csv?date_from=2026-01-01&date_to=2026-12-31', {
      token,
      expect: account.canUseReports ? [200] : [403],
    });

    summary.accounts_verified.push({
      account: account.label,
      role: me.role,
      user_id: me.user_id,
      dashboard: summarizeStats(baseStats),
      filtered_dashboard: summarizeStats(filteredStats),
      report_filters_access: filtersResult.status,
      csv_export_access: exportResult.status,
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[dashboard-live-check] Failed:', error.message);
  process.exitCode = 1;
});
