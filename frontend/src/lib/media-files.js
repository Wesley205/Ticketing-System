export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function isSupportedImageType(mimeType = '') {
  return IMAGE_MIME_TYPES.includes(String(mimeType || '').toLowerCase());
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read the selected image.'));
    reader.readAsDataURL(file);
  });
}

export function imageFileToUploadPayload(file, extra = {}) {
  return fileToDataUrl(file).then((content_base64) => ({
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    content_base64,
    ...extra,
  }));
}

export function formatBytes(bytes = 0) {
  const value = Number(bytes || 0);
  if (!value) return '-';
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}
