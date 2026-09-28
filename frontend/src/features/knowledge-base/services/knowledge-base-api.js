import { apiClient } from '../../../lib/api-client.js';
import { buildQueryParams } from '../../../lib/query-params.js';

export const ARTICLE_STATUSES = ['draft', 'in_review', 'published', 'archived'];
export const ARTICLE_VISIBILITY_SCOPES = ['all_users', 'department', 'operational_only'];

export const DEFAULT_KB_FILTERS = Object.freeze({
  search: '',
  category: '',
  status: '',
});

export function buildArticleListQuery(filters = {}, canManage = false) {
  return buildQueryParams({
    search: filters.search || '',
    category: filters.category || '',
    status: canManage ? filters.status || '' : '',
  });
}

export function buildSuggestionQuery(context = {}) {
  return buildQueryParams({
    category: context.category || '',
    subcategory: context.subcategory || '',
    subject: context.subject || '',
    description: context.description || '',
    affected_asset_id: context.affected_asset_id || '',
    asset_type: context.asset_type || '',
    limit: context.limit || '',
  });
}

export function normalizeArticleRow(row = {}) {
  return {
    ...row,
    helpful_count: Number(row.helpful_count || 0),
    not_helpful_count: Number(row.not_helpful_count || 0),
    view_count: Number(row.view_count || 0),
    current_revision_number: Number(row.current_revision_number || 1),
  };
}

export function normalizeArticleDetail(detail = {}) {
  return {
    ...normalizeArticleRow(detail),
    relations: Array.isArray(detail.relations) ? detail.relations : [],
    revisions: Array.isArray(detail.revisions) ? detail.revisions : [],
    feedback_summary: detail.feedback_summary || {
      helpful_count: detail.helpful_count || 0,
      not_helpful_count: detail.not_helpful_count || 0,
    },
    permissions: detail.permissions || {},
  };
}

export function splitRelations(relations = []) {
  return {
    assetTypes: relations
      .filter((relation) => relation.relation_type === 'asset_type' && relation.asset_type)
      .map((relation) => relation.asset_type),
    ticketCategories: relations
      .filter((relation) => relation.relation_type === 'ticket_category' && relation.ticket_category)
      .map((relation) => relation.ticket_category),
  };
}

export function buildRelationPayload({ asset_types = '', ticket_categories = '' } = {}) {
  const relations = [];
  String(asset_types || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((assetType) => relations.push({ relation_type: 'asset_type', asset_type: assetType }));

  String(ticket_categories || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((category) => relations.push({ relation_type: 'ticket_category', ticket_category: category }));

  return relations;
}

export function slugifyTitle(title = '') {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeArticlePayload(form = {}) {
  return {
    title: String(form.title || '').trim(),
    slug: String(form.slug || '').trim() || slugifyTitle(form.title),
    summary: String(form.summary || '').trim(),
    body: String(form.body || '').trim(),
    category: String(form.category || 'General support').trim() || 'General support',
    status: form.status || 'draft',
    visibility_scope: form.visibility_scope || 'all_users',
    department_id: form.department_id || null,
    search_keywords: String(form.search_keywords || '').trim(),
    change_note: String(form.change_note || '').trim(),
    relations: buildRelationPayload({
      asset_types: form.asset_types,
      ticket_categories: form.ticket_categories,
    }),
  };
}

export async function fetchArticles(filters = {}, canManage = false) {
  const query = buildArticleListQuery(filters, canManage).toString();
  const suffix = query ? `?${query}` : '';
  const rows = await apiClient(`/knowledge-base${suffix}`);
  return Array.isArray(rows) ? rows.map(normalizeArticleRow) : [];
}

export async function fetchArticleDetail(articleId) {
  return normalizeArticleDetail(await apiClient(`/knowledge-base/${articleId}`));
}

export async function fetchArticleRevisions(articleId) {
  const rows = await apiClient(`/knowledge-base/${articleId}/revisions`);
  return Array.isArray(rows) ? rows : [];
}

export async function createArticle(payload) {
  return normalizeArticleDetail(await apiClient('/knowledge-base', {
    method: 'POST',
    body: normalizeArticlePayload(payload),
  }));
}

export async function updateArticle(articleId, payload) {
  return normalizeArticleDetail(await apiClient(`/knowledge-base/${articleId}`, {
    method: 'PUT',
    body: normalizeArticlePayload(payload),
  }));
}

export async function submitArticleFeedback(articleId, payload) {
  return apiClient(`/knowledge-base/${articleId}/feedback`, {
    method: 'POST',
    body: {
      is_helpful: Boolean(payload.is_helpful),
      request_id: payload.request_id || null,
      feedback_note: payload.feedback_note || null,
    },
  });
}

export async function fetchKnowledgeBaseSuggestions(context = {}) {
  const query = buildSuggestionQuery(context).toString();
  const suffix = query ? `?${query}` : '';
  const rows = await apiClient(`/knowledge-base/suggestions${suffix}`);
  return Array.isArray(rows) ? rows.map(normalizeArticleRow) : [];
}
