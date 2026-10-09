const pool = require('../../config/db');
const policy = require('./knowledgeBase.policy');
const service = require('./knowledgeBase.service');
const { KNOWLEDGE_BASE_ERROR_MESSAGES } = require('./knowledgeBase.constants');

function sendError(res, err, fallbackStatus, fallbackMessage) {
  console.error(err);
  if (err?.code === '23505') {
    return res.status(409).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.duplicateSlug });
  }
  return res.status(fallbackStatus).json({ error: fallbackStatus >= 500 ? fallbackMessage : err.message || fallbackMessage });
}

async function listArticles(req, res) {
  try {
    const options = {
      search: req.query.search,
      category: req.query.category,
      status: policy.canCreateArticle(req.user) ? req.query.status : undefined,
      order_by: 'updated',
    };
    const articles = await service.listKnowledgeBaseArticles(pool, options, req.user);
    res.json(articles);
  } catch (err) {
    sendError(res, err, 500, KNOWLEDGE_BASE_ERROR_MESSAGES.listFailed);
  }
}

async function suggestions(req, res) {
  try {
    let assetType = req.query.asset_type || null;
    if (!assetType && req.query.affected_asset_id) {
      assetType = await service.getAssetTypeById(pool, req.query.affected_asset_id);
    }

    const suggestionsList = await service.suggestKnowledgeBaseArticles(
      pool,
      {
        subject: req.query.subject,
        description: req.query.description,
        category: req.query.category,
        subcategory: req.query.subcategory,
        asset_type: assetType,
      },
      Number(req.query.limit || 5)
    );

    res.json(suggestionsList.filter((article) => policy.canViewArticle(req.user, article)));
  } catch (err) {
    sendError(res, err, 500, KNOWLEDGE_BASE_ERROR_MESSAGES.suggestionsFailed);
  }
}

async function detail(req, res) {
  try {
    const article = await service.buildKnowledgeArticleDetail(pool, Number(req.params.id));
    if (!article) {
      return res.status(404).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.articleNotFound });
    }
    if (!policy.canViewArticle(req.user, article)) {
      return res.status(403).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.viewForbidden });
    }

    await service.incrementKnowledgeArticleView(Number(req.params.id), pool);
    article.permissions = policy.buildArticlePermissions(req.user);
    return res.json(article);
  } catch (err) {
    return sendError(res, err, 500, KNOWLEDGE_BASE_ERROR_MESSAGES.viewFailed);
  }
}

async function create(req, res) {
  if (!policy.canCreateArticle(req.user)) {
    return res.status(403).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.createForbidden });
  }

  try {
    const article = await service.createKnowledgeBaseArticle(req.body, req.user.user_id);
    return res.status(201).json(article);
  } catch (err) {
    return sendError(res, err, 400, KNOWLEDGE_BASE_ERROR_MESSAGES.createFailed);
  }
}

async function update(req, res) {
  if (!policy.canUpdateArticle(req.user)) {
    return res.status(403).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.updateForbidden });
  }

  try {
    const article = await service.updateKnowledgeBaseArticle(Number(req.params.id), req.body, req.user.user_id);
    if (!article) {
      return res.status(404).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.articleNotFound });
    }
    return res.json(article);
  } catch (err) {
    return sendError(res, err, 400, KNOWLEDGE_BASE_ERROR_MESSAGES.updateFailed);
  }
}

async function revisions(req, res) {
  try {
    const article = await service.buildKnowledgeArticleDetail(pool, Number(req.params.id));
    if (!article) {
      return res.status(404).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.articleNotFound });
    }
    if (!policy.canViewArticle(req.user, article)) {
      return res.status(403).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.viewForbidden });
    }
    return res.json(article.revisions || []);
  } catch (err) {
    return sendError(res, err, 500, KNOWLEDGE_BASE_ERROR_MESSAGES.revisionsFailed);
  }
}

async function feedback(req, res) {
  if (!policy.canSubmitFeedback(req.user)) {
    return res.status(403).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.feedbackForbidden });
  }

  try {
    const article = await service.loadKnowledgeArticle(pool, Number(req.params.id));
    if (!article) {
      return res.status(404).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.articleNotFound });
    }
    if (!policy.canViewArticle(req.user, article)) {
      return res.status(403).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.feedbackForArticleForbidden });
    }

    const detailResult = await service.addKnowledgeBaseFeedback(req.params.id, req.body, req.user.user_id);
    return res.status(201).json(detailResult.feedback_summary);
  } catch (err) {
    return sendError(res, err, 400, KNOWLEDGE_BASE_ERROR_MESSAGES.feedbackFailed);
  }
}

async function downloadMedia(req, res) {
  try {
    const result = await service.getKnowledgeArticleMediaDownload(
      pool,
      Number(req.params.id),
      Number(req.params.mediaId)
    );
    if (!result) {
      return res.status(404).json({ error: 'Article image not found.' });
    }
    if (!policy.canViewArticle(req.user, result.article)) {
      return res.status(403).json({ error: KNOWLEDGE_BASE_ERROR_MESSAGES.viewForbidden });
    }

    res.setHeader('Content-Type', result.media.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${result.media.file_name}"`);
    if (result.stream) {
      return result.stream.pipe(res);
    }
    return res.sendFile(result.fullPath);
  } catch (err) {
    return sendError(res, err, 404, 'Article image file not found.');
  }
}

module.exports = {
  create,
  detail,
  downloadMedia,
  feedback,
  listArticles,
  revisions,
  suggestions,
  update,
};
