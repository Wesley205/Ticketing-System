async function listCatalogItems(executor) {
  const result = await executor.query(
    `SELECT catalog_item_id, item_code, name, description, category, ticket_type,
            default_priority, approval_required, approver_role, form_schema
     FROM service_catalog_items
     WHERE is_active = TRUE
     ORDER BY sort_order, name`
  );
  return result.rows;
}

async function getCatalogItem(executor, catalogItemId) {
  const result = await executor.query(
    `SELECT catalog_item_id, item_code, name, description, category, ticket_type,
            default_priority, approval_required, approver_role, form_schema
     FROM service_catalog_items
     WHERE catalog_item_id = $1 AND is_active = TRUE`,
    [catalogItemId]
  );
  return result.rows[0] || null;
}

module.exports = { getCatalogItem, listCatalogItems };
