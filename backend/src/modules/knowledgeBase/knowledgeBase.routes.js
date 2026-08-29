const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./knowledgeBase.controller');
const validator = require('./knowledgeBase.validator');

const router = express.Router();

router.get('/', requireAuth, validator.listArticles, controller.listArticles);
router.get('/suggestions', requireAuth, validator.suggestions, controller.suggestions);
router.get('/:id', requireAuth, validator.articleDetail, controller.detail);
router.post('/', requireAuth, validator.createArticle, controller.create);
router.put('/:id', requireAuth, validator.updateArticle, controller.update);
router.get('/:id/revisions', requireAuth, validator.articleDetail, controller.revisions);
router.post('/:id/feedback', requireAuth, validator.feedback, controller.feedback);

module.exports = router;
