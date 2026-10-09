export const ARTICLE_CATEGORY_OPTIONS = Object.freeze([
  'Account access',
  'Network issues',
  'Hardware and devices',
  'Printers',
  'Software and apps',
  'Security steps',
  'General support',
]);

export const ARTICLE_STATUS_LABELS = Object.freeze({
  draft: 'Draft',
  in_review: 'Needs review',
  published: 'Published',
  archived: 'Archived',
});

export const ARTICLE_VISIBILITY_LABELS = Object.freeze({
  all_users: 'All staff',
  department: 'One department',
  operational_only: 'ICT team only',
});

export function formatArticleStatus(status = '') {
  return ARTICLE_STATUS_LABELS[status] || status || 'Draft';
}

export function formatArticleCategory(category = '') {
  return category === 'Security steps' ? 'Security' : category || 'General support';
}

export function safeArticleUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function formatArticleVisibility(scope = '') {
  return ARTICLE_VISIBILITY_LABELS[scope] || scope || 'Everyone';
}

export function getCategoryOptions(currentCategory = '') {
  const trimmed = String(currentCategory || '').trim();
  if (!trimmed || ARTICLE_CATEGORY_OPTIONS.includes(trimmed)) {
    return ARTICLE_CATEGORY_OPTIONS;
  }
  return [trimmed, ...ARTICLE_CATEGORY_OPTIONS];
}
