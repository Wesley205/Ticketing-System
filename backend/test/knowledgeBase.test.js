const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeSearchText,
  scoreKnowledgeBaseSuggestion,
} = require('../src/services/knowledgeBase');

test('normalizeSearchText tokenizes free-form article text consistently', () => {
  assert.deepEqual(
    normalizeSearchText('VPN reset, Password!'),
    ['vpn', 'reset', 'password']
  );
});

test('scoreKnowledgeBaseSuggestion rewards category and asset matches', () => {
  const article = {
    title: 'Reset VPN password',
    summary: 'Guide for remote access issues',
    body: 'Use the self-service password reset flow for VPN users.',
    search_keywords: 'vpn password remote access',
    category: 'Access',
    related_asset_types: ['Laptop'],
    related_ticket_categories: ['Network'],
    related_ticket_subcategories: ['VPN'],
    status: 'published',
  };

  const highScore = scoreKnowledgeBaseSuggestion(article, {
    subject: 'VPN password reset',
    description: 'Remote access not working on my laptop',
    category: 'Network',
    subcategory: 'VPN',
    asset_type: 'Laptop',
  });

  const lowScore = scoreKnowledgeBaseSuggestion(article, {
    subject: 'Printer jam',
    description: 'Paper stuck in tray',
    category: 'Printer',
    subcategory: 'Paper',
    asset_type: 'Printer',
  });

  assert.ok(highScore > lowScore);
});
