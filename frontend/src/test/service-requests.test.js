import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTicketListQuery,
  filterTicketsBySearch,
  isOperationalServiceDeskRole,
  mapSimplifiedTicketPayload,
  paginateTickets,
  technicianAvailability,
  technicianWorkloadCounts,
} from '../features/service-requests/services/service-requests-api.js';

test('service-request query builder preserves supported backend filters only', () => {
  assert.equal(
    buildTicketListQuery({
      status: 'Assigned',
      priority: 'High',
      category: 'Network',
      ticket_type: 'Incident',
      mine: true,
      queue: 'sla_risk',
      search: 'ignored on backend',
    }).toString(),
    'status=Assigned&priority=High&category=Network&ticket_type=Incident&mine=true&queue=sla_risk'
  );
});

test('service-request search is applied client-side across key ticket fields', () => {
  const result = filterTicketsBySearch(
    [
      { request_id: 1, ticket_number: 'NSC-2026-010', subject: 'VPN issue', technician_name: 'Ada' },
      { request_id: 2, ticket_number: 'NSC-2026-011', subject: 'Printer jam', technician_name: 'Bala' },
    ],
    'vpn'
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].request_id, 1);
});

test('service-request pagination stays deterministic for array-backed responses', () => {
  const result = paginateTickets(
    [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
    2,
    2
  );

  assert.deepEqual(result, {
    page: 2,
    pageSize: 2,
    total: 5,
    totalPages: 3,
    items: [{ id: 3 }, { id: 4 }],
  });
});

test('simplified ticket creation maps classification and severity to backend fields', () => {
  const payload = mapSimplifiedTicketPayload({
    ticket_type: 'Incident',
    classification: 'Network|Uplink Failure',
    severity: 'Critical',
    subject: 'Secure uplink down',
    description: 'Primary uplink is not responding.',
    affected_asset_id: '',
    closure_confirmation_required: true,
    catalog_item_id: null,
    catalog_responses: {},
  });

  assert.deepEqual(payload, {
    ticket_type: 'Incident',
    category: 'Network',
    subcategory: 'Uplink Failure',
    priority: 'Critical',
    impact: 'Critical',
    urgency: 'Critical',
    subject: 'Secure uplink down',
    description: 'Primary uplink is not responding.',
    affected_asset_id: null,
    closure_confirmation_required: true,
    catalog_item_id: null,
    catalog_responses: {},
  });
});

test('service desk role helper separates operational users from requesters', () => {
  assert.equal(isOperationalServiceDeskRole('admin'), true);
  assert.equal(isOperationalServiceDeskRole('ict_officer'), true);
  assert.equal(isOperationalServiceDeskRole('staff'), false);
  assert.equal(isOperationalServiceDeskRole('technician'), false);
});

test('technician availability is derived from active workload counts', () => {
  const counts = technicianWorkloadCounts([
    { request_id: 1, assigned_technician_id: 4, status: 'Assigned' },
    { request_id: 2, assigned_technician_id: 4, status: 'In Progress' },
    { request_id: 3, assigned_technician_id: 4, status: 'Closed' },
  ]);

  assert.deepEqual(counts, { 4: 2 });
  assert.deepEqual(
    technicianAvailability({ user_id: 4 }, counts, 3),
    {
      activeCount: 2,
      capacity: 3,
      utilizationPercent: 67,
      state: 'Busy',
      isAvailable: true,
      label: '2 of 3 active - busy',
    }
  );
});

test('explicit technician availability overrides workload-derived availability', () => {
  assert.deepEqual(
    technicianAvailability({
      user_id: 7,
      active_count: 1,
      technician_capacity: 8,
      technician_availability: 'on_leave',
    }),
    {
      activeCount: 1,
      capacity: 8,
      utilizationPercent: 13,
      state: 'On leave',
      isAvailable: false,
      label: '1 of 8 active - on leave',
    }
  );
});
