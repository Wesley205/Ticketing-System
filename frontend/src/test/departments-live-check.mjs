const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = [
  { label: 'staff', identifier: 'ngozi.umeh', canManageDepartments: false },
  { label: 'technician', identifier: 'chinedu.obi', canManageDepartments: false },
  { label: 'ict_officer', identifier: 'ibrahim.musa', canManageDepartments: false },
  { label: 'admin', identifier: 'admin', canManageDepartments: true },
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
    const { payload: departments } = await api('/departments', { token });
    const firstDepartment = Array.isArray(departments) ? departments[0] : null;
    const detailResult = firstDepartment
      ? await api(`/departments/${firstDepartment.department_id}`, { token })
      : { status: 'skipped', payload: null };

    const createResult = await api('/departments', {
      method: 'POST',
      token,
      body: {
        name: `React Verification Department ${account.label} ${Date.now()}`,
        description: 'Created by React departments live verification.',
      },
      expect: account.canManageDepartments ? [201] : [403],
    });

    let updateStatus = 'skipped';
    if (account.canManageDepartments && createResult.payload?.department_id) {
      const updateResult = await api(`/departments/${createResult.payload.department_id}`, {
        method: 'PUT',
        token,
        body: {
          name: createResult.payload.name,
          description: 'Updated by React departments live verification.',
        },
      });
      updateStatus = updateResult.status;
    }

    summary.accounts_verified.push({
      account: account.label,
      role: me.role,
      user_id: me.user_id,
      visible_departments: Array.isArray(departments) ? departments.length : 0,
      first_department_id: firstDepartment?.department_id || null,
      detail_status: detailResult.status,
      detail_staff_rows: Array.isArray(detailResult.payload?.staff) ? detailResult.payload.staff.length : null,
      detail_asset_rows: Array.isArray(detailResult.payload?.assets) ? detailResult.payload.assets.length : null,
      detail_request_rows: Array.isArray(detailResult.payload?.service_requests) ? detailResult.payload.service_requests.length : null,
      create_status: createResult.status,
      update_status: updateStatus,
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[departments-live-check] Failed:', error.message);
  process.exitCode = 1;
});
