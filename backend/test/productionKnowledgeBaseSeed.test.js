const assert = require('node:assert/strict');
const test = require('node:test');
const { loadCollection, validateCollection, articleBody, seedProductionKnowledgeBase, verifyCollection } = require('../src/scripts/seedProductionKnowledgeBase');

function fixture() {
  const rows = [];
  const relations = [];
  const calls = [];
  let released = false;
  const client = {
    async query(sql, values = []) {
      calls.push(sql);
      if (sql.startsWith('SELECT user_id')) return { rows: [{ user_id: 1 }] };
      if (sql.startsWith('SELECT * FROM knowledge_base_articles')) return { rows: rows.filter((row) => row.slug === values[0]) };
      if (sql.includes('INSERT INTO knowledge_base_articles')) {
        const [title, slug, summary, body, category, search_keywords] = values;
        const row = { article_id: rows.length + 1, title, slug, summary, body, category, search_keywords, status: 'published', visibility_scope: 'all_users', department_id: null };
        rows.push(row);
        return { rows: [{ article_id: row.article_id }] };
      }
      if (sql.includes('INSERT INTO knowledge_base_article_revisions')) rows.find((row) => row.article_id === values[0]).revision_body = values[3];
      if (sql.includes('INSERT INTO knowledge_base_article_relations')) relations.push({ slug: rows.find((row) => row.article_id === values[0]).slug, ticket_category: values[1] });
      if (sql.includes('SELECT a.*')) return { rows };
      if (sql.includes('SELECT a.slug')) return { rows: relations };
      return { rows: [] };
    },
    release() { released = true; },
  };
  return { executor: { connect: async () => client }, client, rows, relations, calls, released: () => released };
}

test('production collection has 30 unique source-backed scoped articles and contiguous numbered steps', () => {
  const collection = loadCollection();
  assert.equal(collection.articles.length, 30);
  for (const article of collection.articles) {
    const body = articleBody(article, collection.reviewed_on);
    assert.ok(body.includes('## When to contact ICT'));
    assert.ok(body.includes('\n2. '));
    assert.ok(!body.includes('\n\n2. '));
    assert.ok(article.sources.every((url) => body.includes(url)));
  }
});

test('production seed rejects duplicates, missing sources, unsafe URLs and unverified images', () => {
  for (const mutate of [
    (collection) => { collection.articles[1].slug = collection.articles[0].slug; },
    (collection) => { collection.articles[0].sources = []; },
    (collection) => { collection.articles[0].sources = ['https://support.microsoft.com.evil.example/test']; },
    (collection) => { collection.articles[0].sources = ['javascript:alert(1)']; },
    (collection) => { collection.articles[0].images = ['unverified.png']; },
    (collection) => { collection.articles[0].steps = ['<script>alert(1)</script>']; },
  ]) {
    const collection = loadCollection();
    mutate(collection);
    assert.throws(() => validateCollection(collection));
  }
});

test('production seed imports atomically and reruns without changing existing articles or revisions', async () => {
  const state = fixture();
  assert.deepEqual(await seedProductionKnowledgeBase(state.executor), { created: 30, unchanged: 0 });
  const revisionCount = state.calls.filter((sql) => sql.includes('INSERT INTO knowledge_base_article_revisions')).length;
  assert.equal(revisionCount, 30);
  assert.deepEqual(await seedProductionKnowledgeBase(state.executor), { created: 0, unchanged: 30 });
  assert.equal(state.calls.filter((sql) => sql.includes('INSERT INTO knowledge_base_article_revisions')).length, 30);
  assert.ok(state.calls.includes('COMMIT'));
  assert.ok(state.released());
});

test('production seed rolls back rather than overwriting an edited article', async () => {
  const state = fixture();
  await seedProductionKnowledgeBase(state.executor);
  state.rows[0].body = 'Edited by ICT';
  await assert.rejects(seedProductionKnowledgeBase(state.executor), /Review it manually/);
  assert.equal(state.calls.at(-1), 'ROLLBACK');
  assert.equal(state.rows[0].body, 'Edited by ICT');
});

test('verification detects missing revisions and category relations', async () => {
  const state = fixture();
  await seedProductionKnowledgeBase(state.executor);
  state.rows[0].revision_body = null;
  await assert.rejects(verifyCollection(state.client, loadCollection()), /verification failed/);
  state.rows[0].revision_body = state.rows[0].body;
  state.relations.pop();
  await assert.rejects(verifyCollection(state.client, loadCollection()), /Relation verification failed/);
});
