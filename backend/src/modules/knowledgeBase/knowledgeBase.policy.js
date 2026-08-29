const {
  canManageKnowledgeBase,
  canProvideKnowledgeBaseFeedback,
  canViewKnowledgeBaseArticle,
  constrainKnowledgeBaseVisibility,
} = require('../../utils/authorization');

function applyArticleVisibility(user, queryParts) {
  return constrainKnowledgeBaseVisibility(user, queryParts);
}

function canCreateArticle(user) {
  return canManageKnowledgeBase(user);
}

function canUpdateArticle(user) {
  return canManageKnowledgeBase(user);
}

function canViewArticle(user, article) {
  return canViewKnowledgeBaseArticle(user, article);
}

function canSubmitFeedback(user) {
  return canProvideKnowledgeBaseFeedback(user);
}

function buildArticlePermissions(user) {
  return {
    can_manage: canManageKnowledgeBase(user),
    can_feedback: canProvideKnowledgeBaseFeedback(user),
  };
}

module.exports = {
  applyArticleVisibility,
  buildArticlePermissions,
  canCreateArticle,
  canSubmitFeedback,
  canUpdateArticle,
  canViewArticle,
};
