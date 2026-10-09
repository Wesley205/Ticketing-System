const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { isBlobStorageEnabled, resolveLocalPath } = require('../src/storage/mediaStorage');

test('media storage defaults to the local provider', () => {
  assert.equal(isBlobStorageEnabled({}), false);
  assert.equal(isBlobStorageEnabled({ MEDIA_STORAGE_PROVIDER: 'vercel-blob' }), true);
});

test('local media paths remain inside their configured root', () => {
  const root = path.resolve('storage', 'ticket-attachments');
  assert.equal(resolveLocalPath(root, '12/image.png'), path.join(root, '12', 'image.png'));
  assert.throws(() => resolveLocalPath(root, '../outside.txt'), /Invalid media path/);
});
