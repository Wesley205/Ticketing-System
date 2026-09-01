import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAssetListQuery,
  filterAssetsBySearch,
  paginateAssets,
} from '../features/assets/services/assets-api.js';

test('asset query builder preserves supported backend filters only', () => {
  assert.equal(
    buildAssetListQuery({
      search: 'dell',
      status: 'Assigned',
      asset_type: 'Laptop',
      department_id: 2,
      unsafe: 'ignored',
    }).toString(),
    'search=dell&status=Assigned&asset_type=Laptop&department_id=2'
  );
});

test('asset search matches tag, serial, and department text', () => {
  const result = filterAssetsBySearch(
    [
      { asset_id: 1, asset_tag: 'ICT-LAP-001', serial_number: 'SN-100', department_name: 'ICT' },
      { asset_id: 2, asset_tag: 'ICT-PRN-002', serial_number: 'SN-200', department_name: 'Finance' },
    ],
    'finance'
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].asset_id, 2);
});

test('asset pagination stays deterministic for array-backed responses', () => {
  const result = paginateAssets([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }], 2, 2);

  assert.deepEqual(result, {
    page: 2,
    pageSize: 2,
    total: 4,
    totalPages: 2,
    items: [{ id: 3 }, { id: 4 }],
  });
});
