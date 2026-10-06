const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const projectRoot = path.join(__dirname, '..', '..', '..');
const seedDataPath = path.join(projectRoot, 'database', 'knowledge-base.seed.json');
const seedMediaRoot = path.join(projectRoot, 'database', 'seed-media');
const articleMediaRoot = path.join(projectRoot, 'storage', 'article-media');

function loadSeedArticles() {
  const articles = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'));
  if (!Array.isArray(articles) || articles.length !== 5) {
    throw new Error('Knowledge-base seed must contain exactly five articles.');
  }
  return articles;
}

async function resolveSeedAuthor(client) {
  const result = await client.query(
    `SELECT user_id
     FROM users
     WHERE username IN ('officer', 'admin') AND is_active = TRUE
     ORDER BY CASE username WHEN 'officer' THEN 0 ELSE 1 END
     LIMIT 1`
  );
  if (!result.rows[0]) {
    throw new Error('Seed an active ICT officer or administrator before seeding knowledge articles.');
  }
  return result.rows[0].user_id;
}

async function upsertArticle(client, article, authorUserId) {
  const existing = await client.query(
    'SELECT article_id, current_revision_number FROM knowledge_base_articles WHERE LOWER(slug) = LOWER($1) FOR UPDATE',
    [article.slug]
  );

  if (existing.rows[0]) {
    const result = await client.query(
      `UPDATE knowledge_base_articles
       SET title = $2,
           summary = $3,
           body = $4,
           status = 'published',
           category = $5,
           visibility_scope = 'all_users',
           department_id = NULL,
           search_keywords = $6,
           updated_by_user_id = $7,
           published_at = COALESCE(published_at, NOW()),
           archived_at = NULL,
           last_reviewed_at = NOW()
       WHERE article_id = $1
       RETURNING article_id, current_revision_number`,
      [
        existing.rows[0].article_id,
        article.title,
        article.summary,
        article.body,
        article.category,
        article.search_keywords,
        authorUserId,
      ]
    );
    return result.rows[0];
  }

  const result = await client.query(
    `INSERT INTO knowledge_base_articles
      (title, slug, summary, body, status, category, visibility_scope, department_id,
       search_keywords, created_by_user_id, updated_by_user_id, published_at,
       current_revision_number, last_reviewed_at)
     VALUES ($1,$2,$3,$4,'published',$5,'all_users',NULL,$6,$7,$7,NOW(),1,NOW())
     RETURNING article_id, current_revision_number`,
    [
      article.title,
      article.slug,
      article.summary,
      article.body,
      article.category,
      article.search_keywords,
      authorUserId,
    ]
  );
  return result.rows[0];
}

async function upsertRevision(client, articleId, revisionNumber, article, authorUserId) {
  await client.query(
    `INSERT INTO knowledge_base_article_revisions
      (article_id, revision_number, title, summary, body, category, visibility_scope,
       department_id, search_keywords, change_note, changed_by_user_id)
     VALUES ($1,$2,$3,$4,$5,$6,'all_users',NULL,$7,$8,$9)
     ON CONFLICT (article_id, revision_number) DO UPDATE
     SET title = EXCLUDED.title,
         summary = EXCLUDED.summary,
         body = EXCLUDED.body,
         category = EXCLUDED.category,
         visibility_scope = EXCLUDED.visibility_scope,
         department_id = EXCLUDED.department_id,
         search_keywords = EXCLUDED.search_keywords,
         change_note = EXCLUDED.change_note,
         changed_by_user_id = EXCLUDED.changed_by_user_id`,
    [
      articleId,
      revisionNumber,
      article.title,
      article.summary,
      article.body,
      article.category,
      article.search_keywords,
      'General support seed article',
      authorUserId,
    ]
  );
}

async function replaceRelations(client, articleId, article) {
  await client.query('DELETE FROM knowledge_base_article_relations WHERE article_id = $1', [articleId]);

  for (const assetType of article.asset_types || []) {
    await client.query(
      `INSERT INTO knowledge_base_article_relations (article_id, relation_type, asset_type)
       VALUES ($1, 'asset_type', $2)`,
      [articleId, assetType]
    );
  }
  for (const category of article.ticket_categories || []) {
    await client.query(
      `INSERT INTO knowledge_base_article_relations (article_id, relation_type, ticket_category)
       VALUES ($1, 'ticket_category', $2)`,
      [articleId, category]
    );
  }
}

async function installImage(client, articleId, article, authorUserId) {
  const sourcePath = path.join(seedMediaRoot, article.image.file_name);
  const storageKey = path.posix.join('seed', article.image.file_name);
  const destinationPath = path.join(articleMediaRoot, ...storageKey.split('/'));
  const file = await fs.promises.readFile(sourcePath);

  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.promises.writeFile(destinationPath, file);

  await client.query(
    `INSERT INTO knowledge_base_article_media
      (article_id, uploaded_by_user_id, file_name, storage_key, mime_type,
       file_size_bytes, caption, alt_text, sort_order, deleted_at)
     VALUES ($1,$2,$3,$4,'image/png',$5,$6,$7,0,NULL)
     ON CONFLICT (storage_key) DO UPDATE
     SET article_id = EXCLUDED.article_id,
         uploaded_by_user_id = EXCLUDED.uploaded_by_user_id,
         file_name = EXCLUDED.file_name,
         mime_type = EXCLUDED.mime_type,
         file_size_bytes = EXCLUDED.file_size_bytes,
         caption = EXCLUDED.caption,
         alt_text = EXCLUDED.alt_text,
         sort_order = 0,
         deleted_at = NULL`,
    [
      articleId,
      authorUserId,
      article.image.file_name,
      storageKey,
      file.length,
      article.image.caption,
      article.image.alt_text,
    ]
  );
}

async function seedKnowledgeBase(executor = pool) {
  const articles = loadSeedArticles();
  const client = await executor.connect();
  try {
    await client.query('BEGIN');
    const authorUserId = await resolveSeedAuthor(client);

    for (const article of articles) {
      const saved = await upsertArticle(client, article, authorUserId);
      await upsertRevision(client, saved.article_id, Number(saved.current_revision_number || 1), article, authorUserId);
      await replaceRelations(client, saved.article_id, article);
      await installImage(client, saved.article_id, article, authorUserId);
    }

    await client.query('COMMIT');
    return articles.length;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const count = await seedKnowledgeBase();
  console.log(`[seed:knowledge-base] Installed ${count} published articles with images.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('[seed:knowledge-base] Failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => pool.end());
}

module.exports = {
  loadSeedArticles,
  seedKnowledgeBase,
};
