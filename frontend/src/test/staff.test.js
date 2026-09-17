import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildInvitationListQuery,
  buildStaffListQuery,
  filterIctOfficers,
  filterStaffBySearch,
  paginateStaff,
} from '../features/staff/services/staff-api.js';

test('staff query builder preserves supported backend filters only', () => {
  assert.equal(
    buildStaffListQuery({
      search: 'ada',
      role: 'technician',
      user_type: 'employee',
      department_id: 2,
      ignored: 'nope',
    }).toString(),
    'search=ada&role=technician&user_type=employee&department_id=2'
  );
});

test('invitation query builder preserves supported backend filters only', () => {
  assert.equal(buildInvitationListQuery({ status: 'pending', extra: 'ignored' }).toString(), 'status=pending');
});

test('staff search matches name, email, and department text', () => {
  const result = filterStaffBySearch(
    [
      { user_id: 1, full_name: 'Ada Obi', email: 'ada@example.com', department_name: 'ICT' },
      { user_id: 2, full_name: 'Bala Musa', email: 'bala@example.com', department_name: 'Finance' },
    ],
    'finance'
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].user_id, 2);
});

test('staff helpers derive ICT officers for temporary account sponsorship', () => {
  const officers = filterIctOfficers([
    { user_id: 1, role: 'staff' },
    { user_id: 2, role: 'ict_officer' },
    { user_id: 3, role: 'admin' },
  ]);

  assert.deepEqual(officers, [{ user_id: 2, role: 'ict_officer' }]);
});

test('staff pagination stays deterministic for array-backed responses', () => {
  const result = paginateStaff([{ id: 1 }, { id: 2 }, { id: 3 }], 2, 2);

  assert.deepEqual(result, {
    page: 2,
    pageSize: 2,
    total: 3,
    totalPages: 2,
    items: [{ id: 3 }],
  });
});
