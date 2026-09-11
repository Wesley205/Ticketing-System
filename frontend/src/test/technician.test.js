import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTechnicianDashboard,
  buildMaintenanceQuery,
  formatRelativeMinutes,
  filterMaintenanceBySearch,
  filterWorkByTab,
  splitTechnicianWorkItems,
} from '../features/technician/services/technician-api.js';

test('technician maintenance query builder preserves supported backend filters only', () => {
  assert.equal(
    buildMaintenanceQuery({
      status: 'Scheduled',
      ignored: 'nope',
    }).toString(),
    'status=Scheduled'
  );
});

test('technician maintenance search matches asset and problem text', () => {
  const rows = filterMaintenanceBySearch(
    [
      { maintenance_id: 1, asset_tag: 'ICT-LAP-004', problem: 'Battery replacement' },
      { maintenance_id: 2, asset_tag: 'ICT-PRN-002', problem: 'Paper jam' },
    ],
    'battery'
  );

  assert.equal(rows.length, 1);
  assert.equal(rows[0].maintenance_id, 1);
});

test('technician work split separates active and completed queues', () => {
  const queues = splitTechnicianWorkItems(
    [{ request_id: 1, status: 'Assigned' }, { request_id: 2, status: 'Resolved' }],
    [{ maintenance_id: 3, status: 'Scheduled' }, { maintenance_id: 4, status: 'Completed' }]
  );

  assert.equal(queues.activeTickets.length, 1);
  assert.equal(queues.completedTickets.length, 1);
  assert.equal(queues.activeMaintenance.length, 1);
  assert.equal(queues.completedMaintenance.length, 1);
});

test('technician tab filtering keeps active queue deterministic', () => {
  const rows = filterWorkByTab(
    [
      { id: 1, status: 'Assigned' },
      { id: 2, status: 'Resolved' },
      { id: 3, status: 'Completed' },
    ],
    'active'
  );

  assert.deepEqual(rows, [{ id: 1, status: 'Assigned' }]);
});

test('technician dashboard prioritizes overdue and high priority work', () => {
  const now = new Date('2026-09-11T12:00:00Z');
  const dashboard = buildTechnicianDashboard(
    [
      {
        request_id: 1,
        ticket_number: 'NSC-ICT-4001',
        priority: 'Medium',
        status: 'Assigned',
        sla_resolution_due_at: '2026-09-11T16:00:00Z',
      },
      {
        request_id: 2,
        ticket_number: 'NSC-ICT-4002',
        priority: 'High',
        status: 'In Progress',
        sla_resolution_due_at: '2026-09-11T11:00:00Z',
      },
    ],
    [
      {
        maintenance_id: 5,
        status: 'Scheduled',
        next_due_at: '2026-09-11T14:00:00Z',
      },
    ],
    now
  );

  assert.equal(dashboard.overdueTickets.length, 1);
  assert.equal(dashboard.todayMaintenance.length, 1);
  assert.equal(dashboard.priorityQueue[0].request_id, 2);
  assert.equal(dashboard.nextAction.href, '/technician/work/ticket/2');
});

test('technician dashboard relative minutes labels overdue and remaining work', () => {
  const now = new Date('2026-09-11T12:00:00Z');

  assert.equal(formatRelativeMinutes('2026-09-11T10:46:00Z', now), '1h 14m overdue');
  assert.equal(formatRelativeMinutes('2026-09-11T12:45:00Z', now), '45m left');
});
