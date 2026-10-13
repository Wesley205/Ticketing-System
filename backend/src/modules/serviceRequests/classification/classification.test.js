const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeRecommendationInput, recommendClassification, recommendClassificationWithCatalog } = require('./classification.service');
const { CATEGORY_DEFINITIONS, isValidClassification } = require('./classification.taxonomy');

test('classification recommendations are deterministic for a network description', () => {
  const result = recommendClassification({
    subject: 'Wi-Fi is unavailable',
    description: 'The laptop cannot connect to the wireless network.',
  });
  assert.equal(result.rule_id, 'network-wifi');
  assert.equal(result.recommendations.category.value, 'Network');
  assert.equal(result.recommendations.ticket_type.value, 'Incident');
  assert.ok(result.matched_signals.includes('wi-fi') || result.matched_signals.includes('wi fi'));
});

test('classification returns a review-required empty result for ambiguous text', () => {
  const result = recommendClassification({ subject: 'Help', description: 'The system is not working.' });
  assert.deepEqual(result.recommendations, {});
  assert.equal(result.requires_review, true);
  assert.equal(result.confidence_label, 'low');
});

test('classification input normalizes text without executing or preserving control characters', () => {
  const result = normalizeRecommendationInput({
    subject: "Printer; DROP TABLE users;--",
    description: 'Paper jam\n on floor 3',
  });
  assert.equal(result.subject, 'printer drop table users --');
  assert.equal(result.description, 'paper jam on floor 3');
});

test('classification rejects oversized or non-string input', () => {
  assert.throws(() => normalizeRecommendationInput({ subject: ['printer'] }), /subject must be a string/);
  assert.throws(() => normalizeRecommendationInput({ description: 'x'.repeat(6001) }), /description is too long/);
});

test('service catalog matches enrich recommendations without changing the input', () => {
  const input = {
    subject: 'Request a new email account',
    description: 'Please create an Outlook mailbox for a new staff member.',
  };
  const result = recommendClassificationWithCatalog(input, [{
    catalog_item_id: 12,
    item_code: 'EMAIL-ACCESS',
    name: 'Email account access',
    description: 'Create or update an Outlook email account.',
    category: 'Account Access',
    ticket_type: 'Access Request',
    default_priority: 'Medium',
    approval_required: true,
    is_active: true,
  }]);
  assert.equal(input.subject, 'Request a new email account');
  assert.equal(result.catalog_match.catalog_item_id, 12);
  assert.equal(result.recommendations.category.value, 'Account Access');
  assert.equal(result.recommendations.ticket_type.value, 'Access Request');
  assert.equal(result.recommendations.priority.value, 'Medium');
  assert.equal(result.recommendations.priority.source, 'service_catalog');
});

test('canonical taxonomy accepts precise combinations and rejects mismatched labels', () => {
  assert.ok(Object.keys(CATEGORY_DEFINITIONS).length >= 9);
  assert.equal(isValidClassification('Network', 'Wi-Fi connection'), true);
  assert.equal(isValidClassification('Network', 'Printer offline'), false);
  assert.equal(isValidClassification('Printer', 'Printer offline'), true);
});

test('inactive or unmatched catalog items do not produce a catalog match', () => {
  const result = recommendClassificationWithCatalog(
    { subject: 'Wi-Fi is unavailable', description: 'Wireless network is down.' },
    [{ catalog_item_id: 3, name: 'Old service', category: 'Network', is_active: false }],
  );
  assert.equal(result.catalog_match, undefined);
});
