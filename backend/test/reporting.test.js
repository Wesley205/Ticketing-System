const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildScheduledReportArchitecture,
  parseReportFilters,
} = require('../src/modules/reports/report.service');

test('parseReportFilters normalizes pagination and common filters', () => {
  const filters = parseReportFilters({
    date_from: '2026-08-01',
    date_to: '2026-08-15',
    department_id: '4',
    technician_id: '9',
    category: 'Network',
    ticket_type: 'Incident',
    page: '2',
    page_size: '10',
  });

  assert.equal(filters.department_id, 4);
  assert.equal(filters.technician_id, 9);
  assert.equal(filters.category, 'Network');
  assert.equal(filters.ticket_type, 'Incident');
  assert.equal(filters.page, 2);
  assert.equal(filters.page_size, 10);
  assert.equal(filters.offset, 10);
});

test('parseReportFilters rejects inverted date ranges', () => {
  assert.throws(
    () => parseReportFilters({ date_from: '2026-08-20', date_to: '2026-08-01' }),
    /date_from cannot be after date_to/i
  );
});

test('buildScheduledReportArchitecture exposes a future-ready staged workflow', () => {
  const architecture = buildScheduledReportArchitecture();
  assert.equal(architecture.version, 1);
  assert.match(architecture.stages.join(','), /scoped_query_execution/);
  assert.match(architecture.future_tables.join(','), /scheduled_reports/);
});
