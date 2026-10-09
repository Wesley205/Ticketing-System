const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { deleteMedia, getMedia, putMedia, resolveLocalPath } = require('../storage/mediaStorage');

const ARTICLE_MEDIA_ROOT = path.join(__dirname, '..', '..', '..', 'storage', 'article-media');
const MAX_IMAGE_BYTES = Number(process.env.IMAGE_MEDIA_MAX_BYTES || process.env.TICKET_ATTACHMENT_MAX_BYTES || 2 * 1024 * 1024);
const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sanitizeFileName(fileName) {
  return String(fileName || 'image')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function decodeBase64(contentBase64) {
  const normalized = String(contentBase64 || '').trim();
  const payload = normalized.includes(',') ? normalized.split(',').pop() : normalized;
  return Buffer.from(payload || '', 'base64');
}

function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}

function validateImagePayload({ file_name, mime_type, content_base64 }) {
  const fileName = sanitizeFileName(file_name);
  const declaredMimeType = String(mime_type || '').toLowerCase();
  if (!fileName) {
    throw new Error('A valid image file name is required.');
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.has(declaredMimeType)) {
    throw new Error('Only JPG, PNG, and WEBP images are allowed.');
  }

  const buffer = decodeBase64(content_base64);
  if (!buffer.length) {
    throw new Error('Image content is required.');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds the ${MAX_IMAGE_BYTES} byte limit.`);
  }

  const detectedMimeType = detectImageMimeType(buffer);
  if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
    throw new Error('Image content does not match the declared file type.');
  }

  return { buffer, fileName, mimeType: detectedMimeType };
}

function buildArticleMediaStorageKey(articleId, fileName) {
  const randomId = crypto.randomBytes(12).toString('hex');
  return path.posix.join(String(articleId), `${Date.now()}-${randomId}-${sanitizeFileName(fileName)}`);
}

async function saveArticleMediaFile(articleId, payload) {
  const { buffer, fileName, mimeType } = validateImagePayload(payload);
  const storageKey = buildArticleMediaStorageKey(articleId, fileName);
  const stored = await putMedia({
    storageKey,
    buffer,
    mimeType,
    localRoot: ARTICLE_MEDIA_ROOT,
  });

  return {
    buffer,
    fileName,
    ...stored,
    mimeType,
    storageKey,
  };
}

function resolveArticleMediaPath(storageKey) {
  return resolveLocalPath(ARTICLE_MEDIA_ROOT, storageKey);
}

async function removeArticleMediaFile(storageKey) {
  await deleteMedia({ storageKey, localRoot: ARTICLE_MEDIA_ROOT });
}

async function getArticleMediaFile(storageKey) {
  return getMedia({ storageKey, localRoot: ARTICLE_MEDIA_ROOT });
}

module.exports = {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  detectImageMimeType,
  getArticleMediaFile,
  removeArticleMediaFile,
  resolveArticleMediaPath,
  saveArticleMediaFile,
  validateImagePayload,
};
