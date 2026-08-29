const test = require('node:test');
const assert = require('node:assert/strict');

const constants = require('./knowledgeBase.constants');
const mapper = require('./knowledgeBase.mapper');
const policy = require('./knowledgeBase.policy');
const repository = require('./knowledgeBase.repository');
const routes = require('./knowledgeBase.routes');
const service = require('./knowledgeBase.service');

test('knowledge-base module reuses domain article constants', () => {
  assert.ok(constants.ARTICLE_STATUSES.includes('published'));
  assert.ok(constants.ARTICLE_VISIBILITY_SCOPES.includes('department'));
});

test('knowledge-base mapper composes article detail', () => {
  const detail = mapper.mapArticleDetail({ article_id: 1 }, [{ relation_id: 2 }], { helpful_count: '1' }, []);
  assert.equal(detail.article_id, 1);
  assert.equal(detail.relations.length, 1);
  assert.equal(detail.feedback_summary.helpful_count, '1');
});

test('knowledge-base policy allows managers to manage articles', () => {
  assert.equal(policy.canCreateArticle({ user_id: 1, role: 'ict_officer' }), true);
  assert.equal(policy.canCreateArticle({ user_id: 2, role: 'staff' }), false);
});

test('knowledge-base repository builds visibility-aware list query', () => {
  const query = repository.buildListQuery(
    { search: 'vpn', category: 'Access' },
    ({ clauses, params, alias }) => {
      params.push('published');
      clauses.push(`${alias}.status = $${params.length}`);
    }
  );

  assert.match(query.where, /kba\.status/);
  assert.match(query.where, /kba\.title ILIKE/);
  assert.deepEqual(query.params, ['published', '%vpn%', 'Access']);
});

test('knowledge-base repository supports legacy updated ordering for API list endpoint', async () => {
  const calls = [];
  const executor = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [] };
    },
  };

  await repository.listKnowledgeBaseArticles(executor, { order_by: 'updated' });
  assert.match(calls[0].sql, /ORDER BY kba\.updated_at DESC, kba\.article_id DESC/i);
});

test('knowledge-base routes preserve endpoint surface', () => {
  const endpoints = routes.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods).join(',').toUpperCase()} ${layer.route.path}`);

  assert.ok(endpoints.includes('GET /'));
  assert.ok(endpoints.includes('GET /suggestions'));
  assert.ok(endpoints.includes('GET /:id'));
  assert.ok(endpoints.includes('POST /'));
  assert.ok(endpoints.includes('PUT /:id'));
  assert.ok(endpoints.includes('GET /:id/revisions'));
  assert.ok(endpoints.includes('POST /:id/feedback'));
});

test('knowledge-base relation parsing preserves valid payload fields', () => {
  const relations = service.parseRelations([
    { relation_type: 'asset_type', asset_type: 'Laptop', unsafe: 'ignored' },
  ]);

  assert.deepEqual(relations, [{
    relation_type: 'asset_type',
    asset_id: null,
    asset_type: 'Laptop',
    ticket_category: null,
    ticket_subcategory: null,
  }]);
});
