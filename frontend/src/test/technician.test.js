import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMaintenanceQuery,
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
