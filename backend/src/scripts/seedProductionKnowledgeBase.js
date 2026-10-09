const fs = require('fs');
const path = require('path');

const seedPath = path.resolve(__dirname, '../../../database/knowledge-base.production.json');
const sourceHosts = new Set(['support.microsoft.com', 'support.google.com', 'www.dell.com', 'support.hp.com', 'ncc.gov.ng', 'www.ncc.gov.ng', 'consumer.ncc.gov.ng']);
const categories = new Set(['Account access', 'Network issues', 'Hardware and devices', 'Printers', 'Software and apps', 'Security steps', 'General support']);
const ticketCategories = new Set(['Computer', 'Network', 'Printer', 'Internet', 'Software', 'Email', 'Hardware', 'Other']);

function validateCollection(collection) {
  if (!collection || collection.collection !== 'nsc-production-support-2026-10' || !/^\d{4}-\d{2}-\d{2}$/.test(collection.reviewed_on || '')) {
    throw new Error('Invalid production collection metadata.');
  }
  if (!Array.isArray(collection.articles) || collection.articles.length !== 30) {
    throw new Error('Production collection must contain exactly 30 articles.');
  }
  const slugs = new Set();
  for (const article of collection.articles) {
    if (!/^prod-[a-z0-9-]+$/.test(article.slug || '') || article.slug.length > 200 || slugs.has(article.slug)) {
      throw new Error('Production article slugs must be unique and namespaced.');
    }
    slugs.add(article.slug);
    for (const field of ['title', 'summary', 'platform', 'keywords', 'verify', 'escalate']) {
      if (typeof article[field] !== 'string' || !article[field].trim() || /<[^>]*>/.test(article[field])) {
        throw new Error(`Invalid ${field} for ${article.slug}.`);
      }
    }
    if (article.title.length > 200 || !categories.has(article.category)) throw new Error(`Invalid category or title for ${article.slug}.`);
    if (!Array.isArray(article.ticket_categories) || !article.ticket_categories.length || article.ticket_categories.some((value) => !ticketCategories.has(value))) {
      throw new Error(`Invalid ticket categories for ${article.slug}.`);
    }
    if (!Array.isArray(article.steps) || article.steps.length < 3 || article.steps.some((step) => typeof step !== 'string' || !step.trim() || /<[^>]*>/.test(step))) {
      throw new Error(`Missing safe resolution steps for ${article.slug}.`);
    }
    if (article.image || article.images) throw new Error('Unverified image assets are not allowed in this collection.');
    if (!Array.isArray(article.sources) || !article.sources.length) throw new Error(`Missing sources for ${article.slug}.`);
    for (const source of article.sources) {
      const url = new URL(source);
      if (url.protocol !== 'https:' || !sourceHosts.has(url.hostname) || url.username || url.password) {
        throw new Error(`Unapproved source for ${article.slug}.`);
      }
    }
  }
  return collection;
}

function loadCollection() {
  return validateCollection(JSON.parse(fs.readFileSync(seedPath, 'utf8')));
}

function articleBody(article, reviewedOn) {
  return [
    `# ${article.title}`, `Applies to: ${article.platform}.`,
    '## Before you start',
    'Follow your organisation\'s ICT policy. Stop if a step needs permissions you do not have. Save work before restarting.',
    '## What to do', article.steps.map((step, index) => `${index + 1}. ${step}`).join('\n'),
    '## Check the result', article.verify,
    '## When to contact ICT', article.escalate,
    '## Sources', article.sources.map((source, index) => `- Official guidance ${index + 1}: ${source}`).join('\n'),
    `Source review: ${reviewedOn}. Vendor steps are paraphrased. Safety and escalation guidance is NSC editorial advice; this article is not a guarantee of resolution.`,
  ].join('\n\n');
}

async function verifyCollection(client, collection) {
  const result = await client.query(
    `SELECT a.*, r.body AS revision_body FROM knowledge_base_articles a
     LEFT JOIN knowledge_base_article_revisions r
       ON r.article_id = a.article_id AND r.revision_number = a.current_revision_number
     WHERE a.slug = ANY($1::text[])`, [collection.articles.map((article) => article.slug)]
  );
  if (result.rows.length !== collection.articles.length) throw new Error('Production verification failed: missing articles.');
  for (const article of collection.articles) {
    const row = result.rows.find((entry) => entry.slug === article.slug);
    const body = articleBody(article, collection.reviewed_on);
    if (row.title !== article.title || row.summary !== article.summary || row.category !== article.category || row.search_keywords !== article.keywords || row.body !== body || row.revision_body !== body || row.status !== 'published' || row.visibility_scope !== 'all_users' || row.department_id !== null) {
      throw new Error(`Production verification failed for ${article.slug}.`);
    }
  }
  const relations = await client.query(
    `SELECT a.slug, r.ticket_category FROM knowledge_base_articles a
     JOIN knowledge_base_article_relations r ON r.article_id = a.article_id
     WHERE a.slug = ANY($1::text[]) AND r.relation_type = 'ticket_category'`,
    [collection.articles.map((article) => article.slug)]
  );
  for (const article of collection.articles) {
    const actual = relations.rows.filter((row) => row.slug === article.slug).map((row) => row.ticket_category).sort();
    if (JSON.stringify(actual) !== JSON.stringify([...article.ticket_categories].sort())) throw new Error(`Relation verification failed for ${article.slug}.`);
  }
  return result.rows.length;
}

async function seedProductionKnowledgeBase(executor, collection = loadCollection()) {
  validateCollection(collection);
  const client = await executor.connect();
  const counts = { created: 0, unchanged: 0 };
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('nsc-production-support-2026-10'))");
    const author = await client.query("SELECT user_id FROM users WHERE role = 'admin' AND is_active = TRUE AND COALESCE(account_status, 'active') = 'active' AND (account_expiration_date IS NULL OR account_expiration_date >= CURRENT_DATE) ORDER BY user_id LIMIT 1");
    if (!author.rows[0]) throw new Error('An active administrator is required to publish this collection.');
    const authorId = author.rows[0].user_id;
    for (const article of collection.articles) {
      const body = articleBody(article, collection.reviewed_on);
      const existing = await client.query('SELECT * FROM knowledge_base_articles WHERE LOWER(slug) = LOWER($1) FOR UPDATE', [article.slug]);
      if (existing.rows[0]) {
        const row = existing.rows[0];
        // Never overwrite an editor's work when this one-time production seed is rerun.
        if (row.title !== article.title || row.summary !== article.summary || row.body !== body || row.category !== article.category || row.search_keywords !== article.keywords || row.status !== 'published' || row.visibility_scope !== 'all_users' || row.department_id !== null) {
          throw new Error(`Existing article differs from seed: ${article.slug}. Review it manually; no articles were changed.`);
        }
        counts.unchanged += 1;
        continue;
      }
      const inserted = await client.query(
        `INSERT INTO knowledge_base_articles
          (title, slug, summary, body, status, category, visibility_scope, search_keywords,
           created_by_user_id, updated_by_user_id, published_at, current_revision_number, last_reviewed_at)
         VALUES ($1,$2,$3,$4,'published',$5,'all_users',$6,$7,$7,NOW(),1,$8::date)
         RETURNING article_id`,
        [article.title, article.slug, article.summary, body, article.category, article.keywords, authorId, collection.reviewed_on]
      );
      const articleId = inserted.rows[0].article_id;
      await client.query(
        `INSERT INTO knowledge_base_article_revisions
          (article_id, revision_number, title, summary, body, category, visibility_scope,
           search_keywords, change_note, changed_by_user_id)
         VALUES ($1,1,$2,$3,$4,$5,'all_users',$6,$7,$8)`,
        [articleId, article.title, article.summary, body, article.category, article.keywords,
          `Source-backed production collection reviewed ${collection.reviewed_on}`, authorId]
      );
      for (const category of article.ticket_categories) {
        await client.query("INSERT INTO knowledge_base_article_relations (article_id, relation_type, ticket_category) VALUES ($1,'ticket_category',$2)", [articleId, category]);
      }
      counts.created += 1;
    }
    await verifyCollection(client, collection);
    await client.query('COMMIT');
    return counts;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  const collection = loadCollection();
  if (process.argv.includes('--validate')) {
    console.log(`Validated ${collection.articles.length} source-backed articles; no database changes.`);
    return;
  }
  if (!process.argv.includes('--apply') && !process.argv.includes('--verify')) throw new Error('Choose --validate, --verify or --apply explicitly.');
  const pool = require('../config/db');
  try {
    if (process.argv.includes('--verify')) {
      console.log(`Verified ${await verifyCollection(pool, collection)} published articles and current revisions.`);
    } else {
      console.log(JSON.stringify(await seedProductionKnowledgeBase(pool, collection)));
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { validateCollection, loadCollection, articleBody, verifyCollection, seedProductionKnowledgeBase };
