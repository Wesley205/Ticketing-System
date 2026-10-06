const service = require('./serviceCatalog.service');

async function listCatalogItems(_req, res) {
  try {
    res.json(await service.listCatalogItems());
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load the service catalog.' });
  }
}

module.exports = { listCatalogItems };
