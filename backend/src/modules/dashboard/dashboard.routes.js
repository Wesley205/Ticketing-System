const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./dashboard.controller');
const validator = require('./dashboard.validator');

const router = express.Router();

router.get('/stats', requireAuth, validator.stats, controller.stats);

module.exports = router;
