const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = [
  { label: 'staff', identifier: 'ngozi.umeh', canCreate: false, canSchedule: false },
  { label: 'technician', identifier: 'chinedu.obi', canCreate: true, canSchedule: true },
  { label: 'ict_officer', identifier: 'ibrahim.musa', canCreate: true, canSchedule: true },
  { label: 'admin', identifier: 'admin', canCreate: true, canSchedule: true },
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

function firstVisibleAsset(assets) {
  return (assets || []).find((asset) => asset.asset_id && asset.status !== 'Retired') || assets?.[0] || null;
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
    const { payload: records } = await api('/maintenance', { token });
    const { payload: scheduledRecords } = await api('/maintenance?status=Scheduled', { token });
    const { payload: schedules } = await api('/maintenance/schedules', { token });
    const { payload: activeSchedules } = await api('/maintenance/schedules?is_active=true', { token });
    const { payload: assets } = await api('/assets', { token });
    const asset = firstVisibleAsset(assets);

    const createProbe = asset
      ? await api('/maintenance', {
        method: 'POST',
        token,
        body: {
          asset_id: asset.asset_id,
          problem: `React maintenance live verification probe for ${account.label}`,
          maintenance_type: 'Inspection',
          status: 'Completed',
          action_taken: 'Verification-only inspection record.',
          completion_notes: 'Created by maintenance live verification.',
          checklist_items: ['API contract', 'checklist payload'],
        },
        expect: account.canCreate ? [201] : [403],
      })
      : { status: 'skipped', payload: null };

    let updateStatus = 'skipped';
    if (account.canCreate && createProbe.payload?.maintenance_id) {
      const updateProbe = await api(`/maintenance/${createProbe.payload.maintenance_id}`, {
        method: 'PUT',
        token,
        body: {
          status: 'Completed',
          notes: 'Updated by maintenance live verification.',
          completion_notes: 'Completion update verified.',
          checklist_items: ['API contract', 'checklist payload', 'update payload'],
        },
      });
      updateStatus = updateProbe.status;
    }

    const scheduleProbe = asset
      ? await api('/maintenance/schedules', {
        method: 'POST',
        token,
        body: {
          asset_id: asset.asset_id,
          title: `React maintenance schedule verification ${account.label} ${Date.now()}`,
          description: 'Created by maintenance live verification.',
          maintenance_type: 'Preventive',
          frequency_unit: 'months',
          frequency_value: 1,
          next_due_at: '2026-12-31T09:00',
          reminder_days_before: 3,
          checklist_items: ['Inspect', 'Clean', 'Record'],
        },
        expect: account.canSchedule ? [201] : [403],
      })
      : { status: 'skipped', payload: null };

    let scheduleUpdateStatus = 'skipped';
    if (account.canSchedule && scheduleProbe.payload?.schedule_id) {
      const scheduleUpdateProbe = await api(`/maintenance/schedules/${scheduleProbe.payload.schedule_id}`, {
        method: 'PUT',
        token,
        body: {
          reminder_days_before: 5,
          is_active: true,
          checklist_items: ['Inspect', 'Clean', 'Record', 'Notify'],
        },
      });
      scheduleUpdateStatus = scheduleUpdateProbe.status;
    }

    summary.accounts_verified.push({
      account: account.label,
      role: me.role,
      user_id: me.user_id,
      visible_records: Array.isArray(records) ? records.length : 0,
      scheduled_records: Array.isArray(scheduledRecords) ? scheduledRecords.length : 0,
      visible_schedules: Array.isArray(schedules) ? schedules.length : 0,
      active_schedules: Array.isArray(activeSchedules) ? activeSchedules.length : 0,
      visible_assets: Array.isArray(assets) ? assets.length : 0,
      create_status: createProbe.status,
      update_status: updateStatus,
      schedule_create_status: scheduleProbe.status,
      schedule_update_status: scheduleUpdateStatus,
    });
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[maintenance-live-check] Failed:', error.message);
  process.exitCode = 1;
});
