const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { deleteMedia, getMedia, putMedia, resolveLocalPath } = require('../storage/mediaStorage');

const STORAGE_ROOT = path.join(__dirname, '..', '..', '..', 'storage', 'ticket-attachments');
const MAX_ATTACHMENT_BYTES = Number(process.env.TICKET_ATTACHMENT_MAX_BYTES || 2 * 1024 * 1024);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_TICKET_IMAGE_ATTACHMENTS = Number(process.env.TICKET_IMAGE_ATTACHMENT_LIMIT || 3);

function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function sanitizeFileName(fileName) {
  return String(fileName || 'attachment')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function decodeAttachmentPayload(contentBase64) {
  const normalized = String(contentBase64 || '').trim();
  const payload = normalized.includes(',') ? normalized.split(',').pop() : normalized;
  return Buffer.from(payload || '', 'base64');
}

function validateAttachmentInput({ file_name, mime_type, content_base64 }) {
  const safeFileName = sanitizeFileName(file_name);
  if (!safeFileName) {
    throw new Error('A valid file name is required.');
  }

  if (!ALLOWED_MIME_TYPES.has(mime_type)) {
    throw new Error('This file type is not allowed.');
  }

  const buffer = decodeAttachmentPayload(content_base64);
  if (!buffer.length) {
    throw new Error('Attachment content is required.');
  }

  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment exceeds the ${MAX_ATTACHMENT_BYTES} byte limit.`);
  }

  if (IMAGE_MIME_TYPES.has(mime_type)) {
    const detectedMimeType = detectImageMimeType(buffer);
    if (!detectedMimeType || detectedMimeType !== mime_type) {
      throw new Error('Image content does not match the declared file type.');
    }
  }

  return { safeFileName, buffer };
}

function buildStorageKey(requestId, fileName) {
  const randomId = crypto.randomBytes(12).toString('hex');
  return path.posix.join(String(requestId), `${Date.now()}-${randomId}-${sanitizeFileName(fileName)}`);
}

async function saveAttachmentFile(requestId, payload) {
  const { safeFileName, buffer } = validateAttachmentInput(payload);
  const storageKey = buildStorageKey(requestId, safeFileName);
  const stored = await putMedia({
    storageKey,
    buffer,
    mimeType: payload.mime_type,
    localRoot: STORAGE_ROOT,
  });

  return {
    buffer,
    fileName: safeFileName,
    ...stored,
  };
}

function resolveAttachmentPath(storageKey) {
  return resolveLocalPath(STORAGE_ROOT, storageKey);
}

async function removeAttachmentFile(storageKey) {
  await deleteMedia({ storageKey, localRoot: STORAGE_ROOT });
}

async function getAttachmentFile(storageKey) {
  return getMedia({ storageKey, localRoot: STORAGE_ROOT });
}

module.exports = {
  ALLOWED_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_TICKET_IMAGE_ATTACHMENTS,
  detectImageMimeType,
  getAttachmentFile,
  removeAttachmentFile,
  resolveAttachmentPath,
  saveAttachmentFile,
  sanitizeFileName,
};
