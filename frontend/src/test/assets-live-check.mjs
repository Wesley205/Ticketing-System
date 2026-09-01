const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = {
  admin: { identifier: 'admin' },
  staff: { identifier: 'ngozi.umeh' },
  technician: { identifier: 'chinedu.obi' },
  ictOfficer: { identifier: 'ibrahim.musa' },
};

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
  const [adminSession, staffSession, technicianSession, ictOfficerSession] = await Promise.all([
    login(accounts.admin.identifier),
    login(accounts.staff.identifier),
    login(accounts.technician.identifier),
    login(accounts.ictOfficer.identifier),
  ]);

  const [{ payload: adminMe }, { payload: staffMe }, { payload: technicianMe }, { payload: ictOfficerMe }] = await Promise.all([
    api('/auth/me', { token: adminSession.token }),
    api('/auth/me', { token: staffSession.token }),
    api('/auth/me', { token: technicianSession.token }),
    api('/auth/me', { token: ictOfficerSession.token }),
  ]);

  const { payload: departments } = await api('/departments', { token: adminSession.token });
  const departmentId = Array.isArray(departments) && departments.length ? departments[0].department_id : null;
  const assetTag = `PH6-ASSET-${Date.now()}`;
  const serialNumber = `PH6-SN-${Date.now()}`;

  const verification = {
    checked_at: new Date().toISOString(),
    api_base: API_BASE,
    accounts: {
      admin: { role: adminMe.role, user_id: adminMe.user_id },
      staff: { role: staffMe.role, user_id: staffMe.user_id },
      technician: { role: technicianMe.role, user_id: technicianMe.user_id },
      ict_officer: { role: ictOfficerMe.role, user_id: ictOfficerMe.user_id },
    },
    asset_lifecycle: {},
    access_control: {},
  };

  const { payload: created } = await api('/assets', {
    method: 'POST',
    token: adminSession.token,
    body: {
      asset_tag: assetTag,
      asset_type: 'Laptop',
      brand: 'Dell',
      model: 'Latitude 5440',
      serial_number: serialNumber,
      department_id: departmentId,
      condition: 'Good',
      status: 'Available',
      location: 'Phase 6 Verification Shelf',
      description: 'Phase 6 live verification asset.',
    },
    expect: [201],
  });

  verification.asset_lifecycle.created = {
    asset_id: created.asset_id,
    asset_tag: created.asset_tag,
    status: created.status,
  };

  const { payload: assigned } = await api(`/assets/${created.asset_id}/assign`, {
    method: 'PATCH',
    token: adminSession.token,
    body: {
      assigned_to: staffMe.user_id,
      assignment_notes: 'Phase 6 verification assignment',
      expected_return_at: '2026-09-15T09:00:00',
    },
    expect: [200],
  });

  verification.asset_lifecycle.assigned = {
    assigned_to: assigned.assigned_to,
    status: assigned.status,
  };

  const { payload: detailAfterAssign } = await api(`/assets/${created.asset_id}`, {
    token: adminSession.token,
  });

  verification.asset_lifecycle.history_after_assignment = {
    assignment_history_count: Array.isArray(detailAfterAssign.assignment_history) ? detailAfterAssign.assignment_history.length : 0,
    status_history_count: Array.isArray(detailAfterAssign.status_history) ? detailAfterAssign.status_history.length : 0,
    latest_assignment_user: detailAfterAssign.assignment_history?.[0]?.assigned_user_name || null,
    latest_status: detailAfterAssign.status_history?.[0]?.next_status || null,
  };

  const { payload: returned } = await api(`/assets/${created.asset_id}/return`, {
    method: 'PATCH',
    token: adminSession.token,
    body: {
      return_notes: 'Phase 6 verification return',
      returned_condition: 'Good',
      target_status: 'Available',
    },
    expect: [200],
  });

  verification.asset_lifecycle.returned = {
    assigned_to: returned.assigned_to,
    status: returned.status,
    condition: returned.condition,
  };

  const { payload: detailAfterReturn } = await api(`/assets/${created.asset_id}`, {
    token: adminSession.token,
  });

  verification.asset_lifecycle.history_after_return = {
    assignment_history_count: Array.isArray(detailAfterReturn.assignment_history) ? detailAfterReturn.assignment_history.length : 0,
    status_history_count: Array.isArray(detailAfterReturn.status_history) ? detailAfterReturn.status_history.length : 0,
    latest_assignment_returned_at: detailAfterReturn.assignment_history?.[0]?.returned_at || null,
    latest_status: detailAfterReturn.status_history?.[0]?.next_status || null,
  };

  await api('/assets', {
    method: 'POST',
    token: staffSession.token,
    body: {
      asset_tag: `${assetTag}-STAFF`,
      asset_type: 'Laptop',
    },
    expect: [403],
  });

  await api(`/assets/${created.asset_id}/assign`, {
    method: 'PATCH',
    token: staffSession.token,
    body: {
      assigned_to: technicianMe.user_id,
    },
    expect: [403],
  });

  verification.access_control.staff = {
    create_asset: 'denied_as_expected',
    assign_asset: 'denied_as_expected',
  };

  const { payload: ictOfficerAssets } = await api('/assets', {
    token: ictOfficerSession.token,
  });

  verification.access_control.ict_officer = {
    can_list_assets: Array.isArray(ictOfficerAssets),
    visible_assets: Array.isArray(ictOfficerAssets) ? ictOfficerAssets.length : 0,
  };

  console.log(JSON.stringify(verification, null, 2));
}

main().catch((error) => {
  console.error('[assets-live-check] Failed:', error.message);
  process.exitCode = 1;
});
