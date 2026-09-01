const API_BASE = process.env.NSC_API_BASE_URL || 'http://127.0.0.1:5000/api';
const PASSWORD = process.env.NSC_SEED_PASSWORD || 'Password123!';

const accounts = [
  { label: 'staff', identifier: 'ngozi.umeh' },
  { label: 'technician', identifier: 'chinedu.obi' },
  { label: 'ict_officer', identifier: 'ibrahim.musa' },
  { label: 'admin', identifier: 'admin' },
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

async function verifyAccount(account) {
  const session = await login(account.identifier);
  const token = session.token;
  const { payload: me } = await api('/auth/me', { token });

  return {
    label: account.label,
    role: me.role,
    user_id: me.user_id,
    token,
  };
}

async function main() {
  const summary = [];

  for (const account of accounts) {
    const verified = await verifyAccount(account);
    summary.push({
      account: verified.label,
      role: verified.role,
      user_id: verified.user_id,
    });

    if (verified.label === 'technician') {
      const { payload: assignedTickets } = await api('/service-requests/assigned-to-me', { token: verified.token });
      const { payload: maintenanceRows } = await api('/maintenance', { token: verified.token });
      const actionableTicket = (assignedTickets || []).find((ticket) => !['Resolved', 'Closed', 'Cancelled'].includes(ticket.status));

      summary.push({
        account: 'technician-queues',
        assigned_tickets: Array.isArray(assignedTickets) ? assignedTickets.length : 0,
        maintenance_records: Array.isArray(maintenanceRows) ? maintenanceRows.length : 0,
        maintenance_statuses: Array.isArray(maintenanceRows) ? maintenanceRows.map((record) => record.status) : [],
      });

      if (actionableTicket) {
        const { payload: detail } = await api(`/service-requests/${actionableTicket.request_id}`, { token: verified.token });
        const allowed = detail?.permissions?.allowed_status_transitions || [];

        await api(`/service-requests/${actionableTicket.request_id}/comments`, {
          method: 'POST',
          token: verified.token,
          body: {
            comment_body: 'Phase 5 technician live verification comment.',
            is_internal: true,
          },
          expect: [200, 201],
        });

        if (allowed.length) {
          await api(`/service-requests/${actionableTicket.request_id}/status`, {
            method: 'PATCH',
            token: verified.token,
            body: {
              status: allowed[0],
              note: 'Phase 5 technician live verification status update.',
              resolution: '',
            },
            expect: [200],
          });
        }

        await api(`/service-requests/${actionableTicket.request_id}/assign`, {
          method: 'PATCH',
          token: verified.token,
          body: {
            assigned_technician_id: verified.user_id,
            assignment_notes: 'Unauthorized technician assignment probe.',
          },
          expect: [403],
        });

        summary.push({
          account: 'technician-ticket-check',
          ticket_id: actionableTicket.request_id,
          allowed_transitions: allowed,
        });
      }

      const actionableMaintenance = (maintenanceRows || []).find((record) => !['Completed', 'Cancelled'].includes(record.status));
      if (actionableMaintenance) {
        const nextStatus = actionableMaintenance.status === 'Scheduled' ? 'In Progress' : actionableMaintenance.status;
        await api(`/maintenance/${actionableMaintenance.maintenance_id}`, {
          method: 'PUT',
          token: verified.token,
          body: {
            status: nextStatus,
            notes: 'Phase 5 technician live verification maintenance update.',
            action_taken: 'Workspace verification update.',
            completion_notes: nextStatus === 'Completed' ? 'Verification completion.' : null,
          },
          expect: [200],
        });

        summary.push({
          account: 'technician-maintenance-check',
          maintenance_id: actionableMaintenance.maintenance_id,
          updated_status: nextStatus,
        });
      } else {
        summary.push({
          account: 'technician-maintenance-check',
          maintenance_id: null,
          updated_status: null,
          skipped_reason: 'No open assigned maintenance record was available for a read-only-safe transition check.',
        });
      }
    }

    if (verified.label !== 'technician') {
      const { payload: listPayload } = await api('/service-requests', { token: verified.token });
      await api('/service-requests/assigned-to-me', {
        token: verified.token,
        expect: [403],
      });
      summary.push({
        account: `${verified.label}-queue`,
        visible_service_requests: Array.isArray(listPayload) ? listPayload.length : 0,
        technician_queue_access: 'denied_as_expected',
      });
    }
  }

  console.log(JSON.stringify({
    checked_at: new Date().toISOString(),
    api_base: API_BASE,
    accounts_verified: summary,
  }, null, 2));
}

main().catch((error) => {
  console.error('[technician-live-check] Failed:', error.message);
  process.exitCode = 1;
});
