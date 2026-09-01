export function formatDate(value, locale = 'en-GB') {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value, locale = 'en-GB') {
  if (!value) return '-';
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function humanizeStatus(value) {
  if (!value) return '-';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function statusClassName(value) {
  return `status-${humanizeStatus(value).replace(/\s+/g, '-')}`;
}

export function formatCurrency(value, currency = 'NGN', locale = 'en-NG') {
  const amount = Number(value || 0);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
