const { body, param, query, validationResult } = require('express-validator');
const {
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITY_SCOPES,
  KNOWLEDGE_BASE_ERROR_MESSAGES,
  KNOWLEDGE_BASE_RELATION_TYPES,
} = require('./knowledgeBase.constants');

function sendFirstValidationError(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  return next();
}

const articleIdParamOnly = [
  param('id').isInt({ min: 1 }).withMessage('Article id must be a positive integer.'),
];

const listArticles = [
  query('search').optional().trim().isLength({ max: 200 }).withMessage('Search is too long.'),
  query('category').optional().trim().isLength({ max: 80 }).withMessage('Category is too long.'),
  query('status').optional().isIn(ARTICLE_STATUSES).withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.invalidStatus),
  query('asset_type').optional().trim().isLength({ max: 50 }).withMessage('Asset type is too long.'),
  query('ticket_category').optional().trim().isLength({ max: 80 }).withMessage('Ticket category is too long.'),
  sendFirstValidationError,
];

const suggestions = [
  query('affected_asset_id').optional().isInt({ min: 1 }).withMessage('Affected asset id must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Suggestion limit must be between 1 and 20.'),
  sendFirstValidationError,
];

const articleDetail = [
  ...articleIdParamOnly,
  sendFirstValidationError,
];

const relationValidation = [
  body('relations').optional().isArray().withMessage('Article relations must be an array.'),
  body('relations.*.relation_type').optional().isIn(KNOWLEDGE_BASE_RELATION_TYPES).withMessage('Invalid article relation type.'),
  body('relations.*.asset_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Relation asset id must be a positive integer.'),
];

const createArticle = [
  body('title').trim().notEmpty().withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.titleRequired),
  body('slug').trim().notEmpty().withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.slugRequired),
  body('body').trim().notEmpty().withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.bodyRequired),
  body('status').optional().isIn(ARTICLE_STATUSES).withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.invalidStatus),
  body('visibility_scope').optional().isIn(ARTICLE_VISIBILITY_SCOPES).withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.invalidVisibility),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  ...relationValidation,
  sendFirstValidationError,
];

const updateArticle = [
  ...articleIdParamOnly,
  body('status').optional().isIn(ARTICLE_STATUSES).withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.invalidStatus),
  body('visibility_scope').optional().isIn(ARTICLE_VISIBILITY_SCOPES).withMessage(KNOWLEDGE_BASE_ERROR_MESSAGES.invalidVisibility),
  body('department_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Department id must be a positive integer.'),
  ...relationValidation,
  sendFirstValidationError,
];

const feedback = [
  ...articleIdParamOnly,
  body('is_helpful').isBoolean().withMessage('Feedback helpful flag is required'),
  body('request_id').optional({ nullable: true }).isInt({ min: 1 }).withMessage('Request id must be a positive integer.'),
  sendFirstValidationError,
];

module.exports = {
  articleDetail,
  createArticle,
  feedback,
  listArticles,
  suggestions,
  updateArticle,
};
