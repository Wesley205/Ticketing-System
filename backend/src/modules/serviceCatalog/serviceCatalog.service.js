const pool = require('../../config/db');
const repository = require('./serviceCatalog.repository');

function normalizeCatalogItem(row) {
  return row ? {
    ...row,
    approval_required: Boolean(row.approval_required),
    form_schema: Array.isArray(row.form_schema) ? row.form_schema : [],
  } : null;
}

async function listCatalogItems(executor = pool) {
  return (await repository.listCatalogItems(executor)).map(normalizeCatalogItem);
}

async function getCatalogItem(catalogItemId, executor = pool) {
  return normalizeCatalogItem(await repository.getCatalogItem(executor, catalogItemId));
}

module.exports = { getCatalogItem, listCatalogItems, normalizeCatalogItem };
