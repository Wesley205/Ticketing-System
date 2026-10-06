const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const controller = require('./serviceCatalog.controller');

const router = express.Router();
router.get('/', requireAuth, controller.listCatalogItems);

module.exports = router;
