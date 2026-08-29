async function loadKnowledgeArticle(executor, articleId, lock = false) {
  const result = await executor.query(
    `SELECT kba.*, d.name AS department_name, creator.full_name AS created_by_name, updater.full_name AS updated_by_name
     FROM knowledge_base_articles kba
     LEFT JOIN departments d ON d.department_id = kba.department_id
     LEFT JOIN users creator ON creator.user_id = kba.created_by_user_id
     LEFT JOIN users updater ON updater.user_id = kba.updated_by_user_id
     WHERE kba.article_id = $1
     ${lock ? 'FOR UPDATE OF kba' : ''}`,
    [articleId]
  );
  return result.rows[0] || null;
}

async function loadKnowledgeArticleRelations(executor, articleId) {
  const result = await executor.query(
    `SELECT relation_id, relation_type, asset_id, asset_type, ticket_category, ticket_subcategory
     FROM knowledge_base_article_relations
     WHERE article_id = $1
     ORDER BY relation_id ASC`,
    [articleId]
  );
  return result.rows;
}

async function loadKnowledgeArticleFeedbackSummary(executor, articleId) {
  const result = await executor.query(
    `SELECT
        COUNT(*) FILTER (WHERE is_helpful = TRUE) AS helpful_count,
        COUNT(*) FILTER (WHERE is_helpful = FALSE) AS not_helpful_count
     FROM knowledge_base_article_feedback
     WHERE article_id = $1`,
    [articleId]
  );
  return result.rows[0];
}

async function loadKnowledgeArticleRevisions(executor, articleId) {
  const result = await executor.query(
    `SELECT revision.revision_id,
            revision.revision_number,
            revision.title,
            revision.summary,
            revision.category,
            revision.visibility_scope,
            revision.department_id,
            revision.search_keywords,
            revision.change_note,
            revision.changed_by_user_id,
            revision.created_at,
            u.full_name AS changed_by_name
     FROM knowledge_base_article_revisions revision
     LEFT JOIN users u ON u.user_id = revision.changed_by_user_id
     WHERE revision.article_id = $1::integer
     ORDER BY revision.revision_number DESC, revision.revision_id DESC`,
    [Number(articleId)]
  );

  return result.rows;
}

function buildListQuery(options = {}, visibilityBuilder) {
  const clauses = [];
  const params = [];

  if (visibilityBuilder) {
    visibilityBuilder({ clauses, params, alias: 'kba' });
  }

  if (options.search) {
    params.push(`%${options.search}%`);
    clauses.push(`(
      kba.title ILIKE $${params.length}::text
      OR kba.summary ILIKE $${params.length}::text
      OR kba.body ILIKE $${params.length}::text
      OR kba.search_keywords ILIKE $${params.length}::text
    )`);
  }
  if (options.status) {
    params.push(options.status);
    clauses.push(`kba.status = $${params.length}::varchar`);
  }
  if (options.category) {
    params.push(options.category);
    clauses.push(`kba.category = $${params.length}::varchar`);
  }
  if (options.asset_type) {
    params.push(options.asset_type);
    clauses.push(`EXISTS (
      SELECT 1 FROM knowledge_base_article_relations rel
      WHERE rel.article_id = kba.article_id
        AND rel.relation_type = 'asset_type'
        AND rel.asset_type = $${params.length}::varchar
    )`);
  }
  if (options.ticket_category) {
    params.push(options.ticket_category);
    clauses.push(`EXISTS (
      SELECT 1 FROM knowledge_base_article_relations rel
      WHERE rel.article_id = kba.article_id
        AND rel.relation_type = 'ticket_category'
        AND rel.ticket_category = $${params.length}::varchar
    )`);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

async function listKnowledgeBaseArticles(executor, options = {}, visibilityBuilder = null) {
  const { where, params } = buildListQuery(options, visibilityBuilder);
  const orderBy = options.order_by === 'updated'
    ? `kba.updated_at DESC, kba.article_id DESC`
    : `CASE kba.status WHEN 'published' THEN 0 WHEN 'in_review' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END,
       kba.updated_at DESC,
       kba.article_id DESC`;

  const result = await executor.query(
    `SELECT kba.article_id, kba.title, kba.slug, kba.summary, kba.category, kba.status, kba.visibility_scope,
            kba.department_id, kba.helpful_count, kba.not_helpful_count, kba.view_count,
            kba.current_revision_number, kba.updated_at, d.name AS department_name
     FROM knowledge_base_articles kba
     LEFT JOIN departments d ON d.department_id = kba.department_id
     ${where}
     ORDER BY ${orderBy}`,
    params
  );
  return result.rows;
}

async function insertKnowledgeBaseArticle(client, data, actorUserId) {
  const result = await client.query(
    `INSERT INTO knowledge_base_articles
      (title, slug, summary, body, status, category, visibility_scope, department_id,
       search_keywords, created_by_user_id, updated_by_user_id, published_at, current_revision_number)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$11,1)
     RETURNING *`,
    [
      data.title,
      data.slug,
      data.summary || null,
      data.body,
      data.status || 'draft',
      data.category || 'General',
      data.visibility_scope || 'all_users',
      data.department_id || null,
      data.search_keywords || null,
      actorUserId,
      data.status === 'published' ? new Date() : null,
    ]
  );

  return result.rows[0];
}

async function updateKnowledgeBaseArticle(client, articleId, data, actorUserId, currentRevisionNumber) {
  const result = await client.query(
    `UPDATE knowledge_base_articles
     SET title = COALESCE($1, title),
         slug = COALESCE($2, slug),
         summary = COALESCE($3, summary),
         body = COALESCE($4, body),
         status = COALESCE($5, status),
         category = COALESCE($6, category),
         visibility_scope = COALESCE($7, visibility_scope),
         department_id = $8,
         search_keywords = COALESCE($9, search_keywords),
         updated_by_user_id = $10,
         published_at = CASE
           WHEN COALESCE($5, status) = 'published' AND published_at IS NULL THEN NOW()
           WHEN COALESCE($5, status) <> 'published' THEN published_at
           ELSE published_at
         END,
         archived_at = CASE WHEN COALESCE($5, status) = 'archived' THEN COALESCE(archived_at, NOW()) ELSE archived_at END,
         current_revision_number = $11,
         last_reviewed_at = CASE WHEN COALESCE($12, FALSE) THEN NOW() ELSE last_reviewed_at END
     WHERE article_id = $13
     RETURNING *`,
    [
      data.title,
      data.slug,
      data.summary,
      data.body,
      data.status,
      data.category,
      data.visibility_scope,
      data.department_id || null,
      data.search_keywords,
      actorUserId,
      currentRevisionNumber,
      !!data.mark_reviewed,
      articleId,
    ]
  );

  return result.rows[0] || null;
}

async function replaceKnowledgeArticleRelations(client, articleId, relations = []) {
  await client.query(
    'DELETE FROM knowledge_base_article_relations WHERE article_id = $1',
    [articleId]
  );
  for (const relation of relations) {
    await client.query(
      `INSERT INTO knowledge_base_article_relations
        (article_id, relation_type, asset_id, asset_type, ticket_category, ticket_subcategory)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        articleId,
        relation.relation_type,
        relation.asset_id || null,
        relation.asset_type || null,
        relation.ticket_category || null,
        relation.ticket_subcategory || null,
      ]
    );
  }
}

async function insertKnowledgeArticleRevision(client, articleId, articleState, changedByUserId, changeNote) {
  await client.query(
    `INSERT INTO knowledge_base_article_revisions
      (article_id, revision_number, title, summary, body, category, visibility_scope, department_id,
       search_keywords, change_note, changed_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      articleId,
      articleState.current_revision_number,
      articleState.title,
      articleState.summary || null,
      articleState.body,
      articleState.category,
      articleState.visibility_scope,
      articleState.department_id || null,
      articleState.search_keywords || null,
      changeNote || null,
      changedByUserId || null,
    ]
  );
}

async function incrementKnowledgeArticleView(articleId, executor) {
  await executor.query(
    `UPDATE knowledge_base_articles
     SET view_count = COALESCE(view_count, 0) + 1
     WHERE article_id = $1`,
    [articleId]
  );
}

async function insertKnowledgeBaseFeedback(client, articleId, data, actorUserId) {
  await client.query(
    `INSERT INTO knowledge_base_article_feedback
      (article_id, user_id, request_id, is_helpful, feedback_note)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      articleId,
      actorUserId,
      data.request_id || null,
      !!data.is_helpful,
      data.feedback_note || null,
    ]
  );
}

async function updateArticleFeedbackCounters(client, articleId, helpful, notHelpful) {
  await client.query(
    `UPDATE knowledge_base_articles
     SET helpful_count = $2,
         not_helpful_count = $3,
         usefulness_score = $2 - $3
     WHERE article_id = $1`,
    [articleId, helpful, notHelpful]
  );
}

async function listPublishedSuggestionCandidates(executor) {
  const result = await executor.query(
    `SELECT kba.article_id, kba.title, kba.slug, kba.summary, kba.body, kba.category, kba.status,
            kba.visibility_scope, kba.department_id, kba.search_keywords, kba.helpful_count, kba.not_helpful_count,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN rel.relation_type = 'asset_type' THEN rel.asset_type END), NULL) AS related_asset_types,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN rel.relation_type = 'ticket_category' THEN rel.ticket_category END), NULL) AS related_ticket_categories,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT CASE WHEN rel.relation_type = 'ticket_category' THEN rel.ticket_subcategory END), NULL) AS related_ticket_subcategories
     FROM knowledge_base_articles kba
     LEFT JOIN knowledge_base_article_relations rel ON rel.article_id = kba.article_id
     WHERE kba.status = 'published'
     GROUP BY kba.article_id
     ORDER BY kba.helpful_count DESC, kba.updated_at DESC
     LIMIT 50`
  );

  return result.rows;
}

async function getAssetTypeById(executor, assetId) {
  const result = await executor.query(
    'SELECT asset_type FROM assets WHERE asset_id = $1',
    [assetId]
  );
  return result.rows[0]?.asset_type || null;
}

async function getKnowledgeBaseAnalytics(executor) {
  const [articles, feedback] = await Promise.all([
    executor.query(
      `SELECT
          COUNT(*) FILTER (WHERE status = 'published') AS published,
          COUNT(*) FILTER (WHERE status = 'draft') AS draft,
          COUNT(*) FILTER (WHERE status = 'in_review') AS in_review,
          COUNT(*) FILTER (WHERE status = 'archived') AS archived,
          COALESCE(SUM(view_count), 0) AS total_views
       FROM knowledge_base_articles`
    ),
    executor.query(
      `SELECT
          COUNT(*) FILTER (WHERE is_helpful = TRUE) AS helpful,
          COUNT(*) FILTER (WHERE is_helpful = FALSE) AS not_helpful
       FROM knowledge_base_article_feedback`
    ),
  ]);

  return {
    ...articles.rows[0],
    ...feedback.rows[0],
  };
}

module.exports = {
  buildListQuery,
  getAssetTypeById,
  getKnowledgeBaseAnalytics,
  incrementKnowledgeArticleView,
  insertKnowledgeArticleRevision,
  insertKnowledgeBaseArticle,
  insertKnowledgeBaseFeedback,
  listKnowledgeBaseArticles,
  listPublishedSuggestionCandidates,
  loadKnowledgeArticle,
  loadKnowledgeArticleFeedbackSummary,
  loadKnowledgeArticleRelations,
  loadKnowledgeArticleRevisions,
  replaceKnowledgeArticleRelations,
  updateArticleFeedbackCounters,
  updateKnowledgeBaseArticle,
};
