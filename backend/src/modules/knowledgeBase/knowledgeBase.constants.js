const {
  KNOWLEDGE_BASE_RELATION_TYPES,
  KNOWLEDGE_BASE_STATUSES,
  KNOWLEDGE_BASE_VISIBILITY_SCOPES,
} = require('../../shared/constants/domain');

const ARTICLE_STATUSES = KNOWLEDGE_BASE_STATUSES;
const ARTICLE_VISIBILITY_SCOPES = KNOWLEDGE_BASE_VISIBILITY_SCOPES;

const KNOWLEDGE_BASE_ERROR_MESSAGES = {
  articleNotFound: 'Knowledge-base article not found.',
  createForbidden: 'You do not have permission to create knowledge-base articles.',
  createFailed: 'Failed to create knowledge-base article.',
  duplicateSlug: 'Article slug already exists.',
  feedbackForbidden: 'You do not have permission to submit knowledge-base feedback.',
  feedbackForArticleForbidden: 'You do not have permission to provide feedback for this article.',
  feedbackFailed: 'Failed to submit knowledge-base feedback.',
  invalidStatus: 'Invalid article status',
  invalidVisibility: 'Invalid visibility scope',
  listFailed: 'Failed to load knowledge-base articles.',
  revisionsFailed: 'Failed to load article revisions.',
  suggestionsFailed: 'Failed to load knowledge-base suggestions.',
  titleRequired: 'Title is required',
  slugRequired: 'Slug is required',
  bodyRequired: 'Article body is required',
  updateForbidden: 'You do not have permission to update knowledge-base articles.',
  updateFailed: 'Failed to update knowledge-base article.',
  viewForbidden: 'You do not have permission to view this article.',
  viewFailed: 'Failed to load knowledge-base article.',
};

module.exports = {
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITY_SCOPES,
  KNOWLEDGE_BASE_ERROR_MESSAGES,
  KNOWLEDGE_BASE_RELATION_TYPES,
};
