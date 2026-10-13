const {
  CLASSIFICATION_CONFIDENCE,
  RECOMMENDATION_INPUT_LIMITS,
} = require('./classification.constants');
const { RULES } = require('./classification.rules');

function normalizeText(value, field, maxLength) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value) || typeof value === 'object') {
    throw new TypeError(`${field} must be a string.`);
  }
  const text = String(value).trim();
  if (text.length > maxLength) throw new RangeError(`${field} is too long.`);
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeRecommendationInput(input = {}) {
  const subject = normalizeText(input.subject, 'subject', RECOMMENDATION_INPUT_LIMITS.subject);
  const description = normalizeText(input.description, 'description', RECOMMENDATION_INPUT_LIMITS.description);
  const service_needed = normalizeText(input.service_needed, 'service_needed', RECOMMENDATION_INPUT_LIMITS.service_needed);
  return { subject, description, service_needed, text: [subject, description, service_needed].filter(Boolean).join(' ') };
}

function matchRule(rule, text) {
  const matchedSignals = rule.signals.flat().filter((signal) => text.includes(signal));
  return [...new Set(matchedSignals)];
}

function catalogTokens(item) {
  return String([item.item_code, item.name, item.description, item.category].filter(Boolean).join(' '))
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function matchCatalogItem(item, text, preferredCategory = '') {
  const tokens = [...new Set(catalogTokens(item))];
  const matchedSignals = tokens.filter((token) => text.includes(token));
  const categoryMatch = preferredCategory && String(item.category || '').toLowerCase() === preferredCategory.toLowerCase();
  const score = matchedSignals.length + (categoryMatch ? 2 : 0);
  return { item, matchedSignals, score };
}

function confidenceLabel(confidence) {
  if (confidence >= CLASSIFICATION_CONFIDENCE.HIGH) return 'high';
  if (confidence >= CLASSIFICATION_CONFIDENCE.MEDIUM) return 'medium';
  return 'low';
}

function recommendClassification(input = {}) {
  const normalized = normalizeRecommendationInput(input);
  const matches = RULES.map((rule) => ({ rule, signals: matchRule(rule, normalized.text) }))
    .filter((match) => match.signals.length > 0)
    .sort((a, b) => b.rule.weight - a.rule.weight || a.rule.id.localeCompare(b.rule.id));
  const best = matches[0];

  if (!best) {
    return {
      version: 'rules-v1',
      recommendations: {},
      confidence: 0,
      confidence_label: 'low',
      matched_signals: [],
      rule_id: null,
      requires_review: true,
    };
  }

  const confidence = Math.min(0.99, best.rule.weight + Math.min(0.03, (best.signals.length - 1) * 0.03));
  return {
    version: 'rules-v1',
    recommendations: Object.fromEntries(Object.entries(best.rule.recommendation).map(([field, value]) => [field, {
      value,
      confidence,
      confidence_label: confidenceLabel(confidence),
    }])),
    confidence,
    confidence_label: confidenceLabel(confidence),
    matched_signals: best.signals,
    rule_id: best.rule.id,
    requires_review: confidence < CLASSIFICATION_CONFIDENCE.HIGH,
  };
}

function enrichWithCatalog(recommendation, catalogItems = [], normalizedText = '') {
  const category = recommendation.recommendations.category?.value || '';
  const matches = catalogItems
    .filter((item) => item && item.is_active !== false)
    .map((item) => matchCatalogItem(item, normalizedText, category))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || String(a.item.name).localeCompare(String(b.item.name)));
  const best = matches[0];
  if (!best) return recommendation;

  const item = best.item;
  const catalogConfidence = Math.min(0.96, 0.62 + Math.min(0.24, best.score * 0.06));
  const recommendations = { ...recommendation.recommendations };
  const catalogFields = {
    ticket_type: item.ticket_type,
    category: item.category,
    priority: item.default_priority,
    impact: item.default_priority,
    urgency: item.default_priority,
  };
  for (const [field, value] of Object.entries(catalogFields)) {
    if (!value) continue;
    recommendations[field] = {
      value,
      confidence: Math.max(recommendations[field]?.confidence || 0, catalogConfidence),
      confidence_label: confidenceLabel(Math.max(recommendations[field]?.confidence || 0, catalogConfidence)),
      source: 'service_catalog',
    };
  }

  return {
    ...recommendation,
    recommendations,
    catalog_match: {
      catalog_item_id: item.catalog_item_id,
      item_code: item.item_code,
      name: item.name,
      approval_required: Boolean(item.approval_required),
      matched_signals: best.matchedSignals,
    },
  };
}

function recommendClassificationWithCatalog(input = {}, catalogItems = []) {
  const normalized = normalizeRecommendationInput(input);
  return enrichWithCatalog(recommendClassification(input), catalogItems, normalized.text);
}

module.exports = {
  normalizeRecommendationInput,
  recommendClassification,
  recommendClassificationWithCatalog,
};
