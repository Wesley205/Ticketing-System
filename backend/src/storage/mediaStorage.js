const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

function isBlobStorageEnabled(env = process.env) {
  return String(env.MEDIA_STORAGE_PROVIDER || '').toLowerCase() === 'vercel-blob';
}

function requireBlobSdk() {
  try {
    return require('@vercel/blob');
  } catch (err) {
    const wrapped = new Error('Vercel Blob storage is enabled but @vercel/blob is not installed.');
    wrapped.cause = err;
    throw wrapped;
  }
}

async function putMedia({ storageKey, buffer, mimeType, localRoot }) {
  if (isBlobStorageEnabled()) {
    const { put } = requireBlobSdk();
    const blob = await put(storageKey, buffer, {
      access: 'private',
      addRandomSuffix: false,
      contentType: mimeType,
    });
    return { storageKey: blob.pathname || storageKey };
  }

  const fullPath = path.join(localRoot, ...storageKey.split('/'));
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, buffer);
  return { fullPath, storageKey };
}

async function getMedia({ storageKey, localRoot }) {
  if (isBlobStorageEnabled()) {
    const { get } = requireBlobSdk();
    const result = await get(storageKey, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      const error = new Error('Stored media was not found.');
      error.code = 'ENOENT';
      throw error;
    }
    const stream = typeof result.stream.getReader === 'function'
      ? Readable.fromWeb(result.stream)
      : result.stream;
    return { stream };
  }

  const fullPath = resolveLocalPath(localRoot, storageKey);
  await fs.promises.access(fullPath);
  return { fullPath };
}

async function deleteMedia({ storageKey, localRoot }) {
  if (isBlobStorageEnabled()) {
    const { del } = requireBlobSdk();
    await del(storageKey);
    return;
  }

  try {
    await fs.promises.unlink(resolveLocalPath(localRoot, storageKey));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }
}

function resolveLocalPath(localRoot, storageKey) {
  const fullPath = path.join(localRoot, ...String(storageKey || '').split('/'));
  const normalizedRoot = path.resolve(localRoot);
  const normalizedPath = path.resolve(fullPath);
  const relativePath = path.relative(normalizedRoot, normalizedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Invalid media path.');
  }
  return normalizedPath;
}

module.exports = {
  deleteMedia,
  getMedia,
  isBlobStorageEnabled,
  putMedia,
  resolveLocalPath,
};
