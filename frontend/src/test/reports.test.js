import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildReportQuery,
  buildResolvedTechnicianRows,
  formatRatio,
  normalizeReportRows,
  normalizeReportSummary,
} from '../features/reports/services/reports-api.js';

test('report query builder preserves backend-supported filters and pagination only', () => {
  const query = buildReportQuery(
    {
      date_from: '2026-01-01',
      date_to: '2026-12-31',
      department_id: 3,
      technician_id: 8,
      category: 'Network',
      ticket_type: 'Incident',
      unsafe: 'drop',
    },
    { page: 2, page_size: 10, sort: 'subject' },
  );

  assert.equal(query.toString(), 'date_from=2026-01-01&date_to=2026-12-31&department_id=3&technician_id=8&category=Network&ticket_type=Incident&page=2&page_size=10');
});

test('report row normalizer calculates stable pagination metadata', () => {
  const rows = normalizeReportRows({
    page: '2',
    page_size: '10',
    total: '31',
    rows: [{ ticket_number: 'NSC-1' }],
  });

  assert.equal(rows.page, 2);
  assert.equal(rows.total, 31);
  assert.equal(rows.total_pages, 4);
  assert.deepEqual(rows.rows, [{ ticket_number: 'NSC-1' }]);
});

test('report summary normalizer supplies safe empty arrays and objects', () => {
  const summary = normalizeReportSummary({
    requests_by_status: [{ status: 'Resolved', total: '4' }],
    sla_performance: { response_met: '2' },
  });

  assert.deepEqual(summary.requests_by_status, [{ status: 'Resolved', total: '4' }]);
  assert.deepEqual(summary.assets_by_status, []);
  assert.deepEqual(summary.sla_performance, { response_met: '2' });
  assert.deepEqual(summary.requests_by_assignment, {});
});

test('technician workload rows merge resolved counts by technician name', () => {
  const rows = buildResolvedTechnicianRows(
    [{ technician: 'Ada', open_requests: '3' }, { technician: 'Tunde', open_requests: null }],
    [{ technician: 'Ada', resolved_count: '5' }],
  );

  assert.deepEqual(rows, [
    { technician: 'Ada', open_requests: 3, resolved_count: 5 },
    { technician: 'Tunde', open_requests: 0, resolved_count: 0 },
  ]);
});

test('report ratio formatter handles empty and measured SLA values', () => {
  assert.equal(formatRatio(7, 10), '70%');
  assert.equal(formatRatio(0, 0), '0%');
});
