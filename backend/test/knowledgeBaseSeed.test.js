const assert = require('assert');
const fs = require('fs');
const path = require('path');
const test = require('node:test');
const { loadSeedArticles } = require('../src/scripts/seedKnowledgeBase');

const projectRoot = path.join(__dirname, '..', '..');

test('knowledge-base seed provides five published-ready articles with valid images', () => {
  const articles = loadSeedArticles();

  assert.equal(articles.length, 5);
  assert.equal(new Set(articles.map((article) => article.slug)).size, 5);

  for (const article of articles) {
    assert.ok(article.title.trim());
    assert.ok(article.summary.trim());
    assert.ok(article.body.includes('# '));
    assert.ok(article.category.trim());
    assert.ok(article.image.caption.trim());
    assert.ok(article.image.alt_text.trim());

    const imagePath = path.join(projectRoot, 'database', 'seed-media', article.image.file_name);
    const stats = fs.statSync(imagePath);
    assert.ok(stats.size > 0);
    assert.ok(stats.size <= 2 * 1024 * 1024);
  }
});
