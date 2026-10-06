DROP INDEX IF EXISTS idx_service_requests_floor;
DROP INDEX IF EXISTS idx_assets_floor;
DROP INDEX IF EXISTS idx_users_technician_floor;

ALTER TABLE service_requests DROP COLUMN IF EXISTS floor_id;
ALTER TABLE assets DROP COLUMN IF EXISTS floor_id;
ALTER TABLE users DROP COLUMN IF EXISTS floor_id;

DROP TABLE IF EXISTS floors;
