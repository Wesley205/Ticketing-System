const pool = require('../../config/db');
const { withTransaction } = require('../../utils/transactions');
const { logAction } = require('../../utils/audit');
const mapper = require('./knowledgeBase.mapper');
const policy = require('./knowledgeBase.policy');
const repository = require('./knowledgeBase.repository');
const {
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITY_SCOPES,
} = require('./knowledgeBase.constants');

function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function scoreKnowledgeBaseSuggestion(article, context = {}) {
  const haystack = normalizeSearchText(
    [
      article.title,
      article.summary,
      article.body,
      article.search_keywords,
      article.category,
      article.related_asset_types,
      article.related_ticket_categories,
    ].join(' ')
  );
  const needle = normalizeSearchText(
    [
      context.subject,
      context.description,
      context.category,
      context.subcategory,
      context.asset_type,
    ].join(' ')
  );

  let score = 0;
  const haystackSet = new Set(haystack);
  for (const token of needle) {
    if (haystackSet.has(token)) score += 3;
  }

  if (context.category && article.related_ticket_categories?.includes(context.category)) {
    score += 8;
  }
  if (context.subcategory && article.related_ticket_subcategories?.includes(context.subcategory)) {
    score += 6;
  }
  if (context.asset_type && article.related_asset_types?.includes(context.asset_type)) {
    score += 7;
  }
  if (article.status === 'published') {
    score += 2;
  }

  return score;
}

function parseRelations(rawRelations) {
  if (!Array.isArray(rawRelations)) return [];
  return rawRelations.filter(Boolean).map((relation) => ({
    relation_type: relation.relation_type,
    asset_id: relation.asset_id || null,
    asset_type: relation.asset_type || null,
    ticket_category: relation.ticket_category || null,
    ticket_subcategory: relation.ticket_subcategory || null,
  }));
}

async function loadKnowledgeArticle(executor, articleId) {
  return mapper.mapArticleRow(await repository.loadKnowledgeArticle(executor, articleId));
}

async function buildKnowledgeArticleDetail(executor, articleId) {
  const article = await repository.loadKnowledgeArticle(executor, articleId);
  if (!article) return null;

  const [relations, feedback, revisions] = await Promise.all([
    repository.loadKnowledgeArticleRelations(executor, articleId),
    repository.loadKnowledgeArticleFeedbackSummary(executor, articleId),
    repository.loadKnowledgeArticleRevisions(executor, articleId),
  ]);

  return mapper.mapArticleDetail(article, relations, feedback, revisions);
}

async function listKnowledgeBaseArticles(executor, options = {}, actorUser = null) {
  const visibilityBuilder = actorUser
    ? (parts) => policy.applyArticleVisibility(actorUser, parts)
    : null;
  const rows = await repository.listKnowledgeBaseArticles(executor, options, visibilityBuilder);
  return mapper.mapArticleRows(rows);
}

async function createKnowledgeBaseArticle(data, actorUserId) {
  return withTransaction(async (client) => {
    const normalizedData = {
      ...data,
      relations: parseRelations(data.relations),
    };
    const article = await repository.insertKnowledgeBaseArticle(client, normalizedData, actorUserId);
    await repository.replaceKnowledgeArticleRelations(client, article.article_id, normalizedData.relations);
    await repository.insertKnowledgeArticleRevision(
      client,
      article.article_id,
      article,
      actorUserId,
      normalizedData.change_note || 'Initial article version'
    );
    await logAction(
      actorUserId,
      'Knowledge article created',
      'knowledge_base_article',
      article.article_id,
      article.title,
      client
    );
    return buildKnowledgeArticleDetail(client, article.article_id);
  });
}

async function updateKnowledgeBaseArticle(articleId, data, actorUserId) {
  return withTransaction(async (client) => {
    const existing = await repository.loadKnowledgeArticle(client, articleId, true);
    if (!existing) return null;

    const normalizedData = {
      ...data,
      relations: parseRelations(data.relations),
    };
    const currentRevisionNumber = Number(existing.current_revision_number || 1) + 1;
    const article = await repository.updateKnowledgeBaseArticle(
      client,
      articleId,
      normalizedData,
      actorUserId,
      currentRevisionNumber
    );

    await repository.replaceKnowledgeArticleRelations(client, articleId, normalizedData.relations);
    await repository.insertKnowledgeArticleRevision(
      client,
      articleId,
      article,
      actorUserId,
      normalizedData.change_note || 'Article updated'
    );
    await logAction(
      actorUserId,
      'Knowledge article updated',
      'knowledge_base_article',
      articleId,
      article.title,
      client
    );
    return buildKnowledgeArticleDetail(client, articleId);
  });
}

async function incrementKnowledgeArticleView(articleId, executor = pool) {
  return repository.incrementKnowledgeArticleView(articleId, executor);
}

async function addKnowledgeBaseFeedback(articleId, data, actorUserId) {
  return withTransaction(async (client) => {
    const article = await repository.loadKnowledgeArticle(client, articleId);
    if (!article) return null;

    await repository.insertKnowledgeBaseFeedback(client, articleId, data, actorUserId);

    const summary = await repository.loadKnowledgeArticleFeedbackSummary(client, articleId);
    const helpful = Number(summary.helpful_count || 0);
    const notHelpful = Number(summary.not_helpful_count || 0);

    await repository.updateArticleFeedbackCounters(client, articleId, helpful, notHelpful);
    await logAction(
      actorUserId,
      'Knowledge article feedback added',
      'knowledge_base_article',
      articleId,
      data.is_helpful ? 'Helpful' : 'Not helpful',
      client
    );
    return buildKnowledgeArticleDetail(client, articleId);
  });
}

async function suggestKnowledgeBaseArticles(executor, context = {}, limit = 5) {
  const rows = await repository.listPublishedSuggestionCandidates(executor);
  return rows
    .map((article) => ({
      ...article,
      suggestion_score: scoreKnowledgeBaseSuggestion(article, context),
    }))
    .filter((article) => article.suggestion_score > 0)
    .sort(
      (a, b) =>
        b.suggestion_score - a.suggestion_score ||
        Number(b.helpful_count || 0) - Number(a.helpful_count || 0)
    )
    .slice(0, limit);
}

async function getAssetTypeById(executor, assetId) {
  return repository.getAssetTypeById(executor, assetId);
}

async function getKnowledgeBaseAnalytics(executor) {
  return repository.getKnowledgeBaseAnalytics(executor);
}

module.exports = {
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITY_SCOPES,
  addKnowledgeBaseFeedback,
  buildKnowledgeArticleDetail,
  createKnowledgeBaseArticle,
  getAssetTypeById,
  getKnowledgeBaseAnalytics,
  incrementKnowledgeArticleView,
  listKnowledgeBaseArticles,
  loadKnowledgeArticle,
  normalizeSearchText,
  parseRelations,
  scoreKnowledgeBaseSuggestion,
  suggestKnowledgeBaseArticles,
  updateKnowledgeBaseArticle,
};
