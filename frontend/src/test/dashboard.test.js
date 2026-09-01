import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDashboardStatsQuery,
  formatHours,
  formatPercent,
  getDashboardScope,
  normalizeDashboardStats,
} from '../features/dashboard/services/dashboard-api.js';

test('dashboard query builder preserves existing backend filter keys only', () => {
  assert.equal(
    buildDashboardStatsQuery({
      date_from: '2026-08-01',
      date_to: '2026-08-31',
      department_id: 2,
      technician_id: 35,
      category: 'Network',
      ticket_type: 'Incident',
      page: 10,
    }).toString(),
    'date_from=2026-08-01&date_to=2026-08-31&department_id=2&technician_id=35&category=Network&ticket_type=Incident'
  );
});

test('dashboard stats normalizer returns stable numeric and array values', () => {
  const stats = normalizeDashboardStats({
    total_requests: '4',
    response_sla_met_rate: null,
    avg_resolution_hours: '2.5',
    tickets_by_status: [{ status: 'New', total: '2' }],
  });

  assert.equal(stats.total_requests, 4);
  assert.equal(stats.response_sla_met_rate, null);
  assert.equal(stats.avg_resolution_hours, 2.5);
  assert.deepEqual(stats.tickets_by_status, [{ status: 'New', total: '2' }]);
  assert.deepEqual(stats.assets_by_status, []);
});

test('dashboard formatting helpers handle nullable metric values', () => {
  assert.equal(formatPercent(null), '-');
  assert.equal(formatPercent(0.756), '76%');
  assert.equal(formatHours(null), '-');
  assert.equal(formatHours(1.234), '1.2');
});

test('dashboard scope labels mirror frontend access profile scope', () => {
  assert.equal(getDashboardScope({ scope: { organization_scope: true } }), 'Organization scope');
  assert.equal(getDashboardScope({ scope: { assigned_only: true } }), 'Assigned-only scope');
  assert.equal(getDashboardScope({ scope: { department_scope: true } }), 'Department scope');
  assert.equal(getDashboardScope({ scope: {} }), 'Self-service scope');
});
