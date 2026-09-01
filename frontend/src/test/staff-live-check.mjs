const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = {
  admin: { identifier: 'admin' },
  staff: { identifier: 'ngozi.umeh' },
  technician: { identifier: 'chinedu.obi' },
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

function deriveOrgEmail(adminMe, unique) {
  const email = String(adminMe.email || '');
  const domain = email.includes('@') ? email.split('@')[1] : 'example.com';
  return `phase7.staff.${unique}@${domain}`;
}

async function main() {
  const [adminSession, staffSession, technicianSession] = await Promise.all([
    login(accounts.admin.identifier),
    login(accounts.staff.identifier),
    login(accounts.technician.identifier),
  ]);

  const [{ payload: adminMe }, { payload: staffMe }, { payload: technicianMe }] = await Promise.all([
    api('/auth/me', { token: adminSession.token }),
    api('/auth/me', { token: staffSession.token }),
    api('/auth/me', { token: technicianSession.token }),
  ]);

  const { payload: departments } = await api('/departments', { token: adminSession.token });
  const departmentId = Array.isArray(departments) && departments.length ? departments[0].department_id : null;
  const unique = Date.now();
  const createdEmail = deriveOrgEmail(adminMe, unique);
  const createdUsername = `phase7user${String(unique).slice(-6)}`;
  const invitationEmail = `phase7.contractor.${unique}@external.test`;

  const summary = {
    checked_at: new Date().toISOString(),
    api_base: API_BASE,
    accounts: {
      admin: { role: adminMe.role, user_id: adminMe.user_id },
      staff: { role: staffMe.role, user_id: staffMe.user_id },
      technician: { role: technicianMe.role, user_id: technicianMe.user_id },
    },
    admin_lifecycle: {},
    access_control: {},
  };

  const { payload: createdUser } = await api('/staff', {
    method: 'POST',
    token: adminSession.token,
    body: {
      full_name: 'Phase 7 React Verification User',
      email: createdEmail,
      username: createdUsername,
      password: 'Password123!',
      role: 'staff',
      user_type: 'employee',
      department_id: departmentId,
      phone: '08000000000',
      account_start_date: '2026-08-31',
    },
    expect: [201],
  });

  summary.admin_lifecycle.created_user = {
    user_id: createdUser.user_id,
    role: createdUser.role,
    is_active: createdUser.is_active,
    account_status: createdUser.account_status,
  };

  const { payload: updatedUser } = await api(`/staff/${createdUser.user_id}`, {
    method: 'PUT',
    token: adminSession.token,
    body: {
      full_name: 'Phase 7 React Verification User Updated',
      email: createdEmail,
      role: 'technician',
      user_type: 'employee',
      department_id: departmentId,
      phone: '08011111111',
      sponsor_name: null,
      supervisor_user_id: null,
      account_start_date: '2026-08-31',
      account_expiration_date: null,
    },
    expect: [200],
  });

  summary.admin_lifecycle.updated_user = {
    user_id: updatedUser.user_id,
    role: updatedUser.role,
    phone: updatedUser.phone,
  };

  const { payload: deactivatedUser } = await api(`/staff/${createdUser.user_id}/status`, {
    method: 'PATCH',
    token: adminSession.token,
    body: {
      is_active: false,
      deactivation_reason: 'Phase 7 React verification deactivation',
    },
    expect: [200],
  });

  const { payload: reactivatedUser } = await api(`/staff/${createdUser.user_id}/status`, {
    method: 'PATCH',
    token: adminSession.token,
    body: {
      is_active: true,
      deactivation_reason: null,
    },
    expect: [200],
  });

  summary.admin_lifecycle.status_toggle = {
    deactivated_status: deactivatedUser.account_status,
    reactivated_status: reactivatedUser.account_status,
  };

  const { payload: createdInvitation } = await api('/invitations', {
    method: 'POST',
    token: adminSession.token,
    body: {
      full_name: 'Phase 7 Contractor Invite',
      email: invitationEmail,
      preferred_username: `phase7invite${String(unique).slice(-6)}`,
      role: 'staff',
      user_type: 'contractor',
      department_id: departmentId,
      account_start_date: '2026-08-31',
      account_expiration_date: '2026-12-31',
      expires_in_days: 7,
      sponsor_name: 'Phase 7 Supervisor',
    },
    expect: [201],
  });

  const { payload: invitationList } = await api('/invitations?status=pending', {
    token: adminSession.token,
  });

  const { payload: revokedInvitation } = await api(`/invitations/${createdInvitation.invitation_id}/revoke`, {
    method: 'POST',
    token: adminSession.token,
    expect: [200],
  });

  summary.admin_lifecycle.invitation = {
    invitation_id: createdInvitation.invitation_id,
    acceptance_url_present: Boolean(createdInvitation.acceptance_url),
    pending_visible: Array.isArray(invitationList)
      ? invitationList.some((item) => Number(item.invitation_id) === Number(createdInvitation.invitation_id))
      : false,
    revoked_status: revokedInvitation.status,
  };

  await api('/staff', {
    method: 'POST',
    token: staffSession.token,
    body: {
      full_name: 'Unauthorized Staff Create',
      email: `blocked.${unique}@example.com`,
      username: `blocked${String(unique).slice(-6)}`,
      password: 'Password123!',
      role: 'staff',
      user_type: 'employee',
    },
    expect: [403],
  });

  await api('/invitations', {
    method: 'POST',
    token: technicianSession.token,
    body: {
      full_name: 'Unauthorized Invite',
      email: `blocked.invite.${unique}@external.test`,
      role: 'staff',
      user_type: 'contractor',
      account_expiration_date: '2026-12-31',
      sponsor_name: 'Blocked',
    },
    expect: [403],
  });

  summary.access_control = {
    staff_create_user: 'denied_as_expected',
    technician_create_invitation: 'denied_as_expected',
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error('[staff-live-check] Failed:', error.message);
  process.exitCode = 1;
});
