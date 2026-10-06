const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./floor.controller');

const router = express.Router();

router.use(requireAuth);
router.get('/', controller.listFloors);

module.exports = router;
