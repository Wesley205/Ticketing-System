DROP INDEX IF EXISTS idx_service_requests_approval_queue;
DROP INDEX IF EXISTS idx_service_catalog_active;

ALTER TABLE service_requests
  DROP COLUMN IF EXISTS approval_note,
  DROP COLUMN IF EXISTS approval_decided_at,
  DROP COLUMN IF EXISTS approval_decided_by,
  DROP COLUMN IF EXISTS approval_role,
  DROP COLUMN IF EXISTS approval_status,
  DROP COLUMN IF EXISTS catalog_responses,
  DROP COLUMN IF EXISTS catalog_item_id;

DROP TABLE IF EXISTS service_catalog_items;
