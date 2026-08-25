const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ALLOWED_MIME_TYPES,
  sanitizeFileName,
} = require('../src/utils/ticketAttachments');

test('sanitizeFileName removes path separators and unsafe characters', () => {
  assert.equal(sanitizeFileName('../Quarterly Report?.pdf'), '.._Quarterly_Report_.pdf');
  assert.equal(sanitizeFileName('plain-name.txt'), 'plain-name.txt');
});

test('allowed attachment mimes include expected office and image formats', () => {
  assert.equal(ALLOWED_MIME_TYPES.has('application/pdf'), true);
  assert.equal(ALLOWED_MIME_TYPES.has('image/png'), true);
  assert.equal(ALLOWED_MIME_TYPES.has('application/zip'), false);
});
