import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTicketListQuery,
  filterTicketsBySearch,
  paginateTickets,
} from '../features/service-requests/services/service-requests-api.js';

test('service-request query builder preserves supported backend filters only', () => {
  assert.equal(
    buildTicketListQuery({
      status: 'Assigned',
      priority: 'High',
      category: 'Network',
      ticket_type: 'Incident',
      mine: true,
      search: 'ignored on backend',
    }).toString(),
    'status=Assigned&priority=High&category=Network&ticket_type=Incident&mine=true'
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
