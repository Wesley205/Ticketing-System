const { TICKET_PRIORITIES, TICKET_TYPES } = require('../serviceRequest.constants');

const { CLASSIFICATION_CATEGORIES } = require('./classification.taxonomy');

const CLASSIFICATION_CONFIDENCE = Object.freeze({
  HIGH: 0.8,
  MEDIUM: 0.6,
});

const RECOMMENDATION_INPUT_LIMITS = Object.freeze({
  subject: 240,
  description: 6000,
  service_needed: 120,
});

module.exports = {
  CLASSIFICATION_CATEGORIES,
  CLASSIFICATION_CONFIDENCE,
  RECOMMENDATION_INPUT_LIMITS,
  TICKET_PRIORITIES,
  TICKET_TYPES,
};
