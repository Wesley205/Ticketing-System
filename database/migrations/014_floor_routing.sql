CREATE TABLE IF NOT EXISTS floors (
  floor_id SERIAL PRIMARY KEY,
  floor_label VARCHAR(80) NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO floors (floor_label, sort_order)
VALUES
  ('Ground Floor', 0),
  ('First Floor', 1),
  ('Second Floor', 2),
  ('Third Floor', 3),
  ('Fourth Floor', 4)
ON CONFLICT (floor_label) DO NOTHING;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS floor_id INTEGER REFERENCES floors(floor_id) ON DELETE SET NULL;

ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS floor_id INTEGER REFERENCES floors(floor_id) ON DELETE SET NULL;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS floor_id INTEGER REFERENCES floors(floor_id) ON DELETE SET NULL;

UPDATE service_requests sr
SET floor_id = a.floor_id
FROM assets a
WHERE sr.affected_asset_id = a.asset_id
  AND sr.floor_id IS NULL
  AND a.floor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_technician_floor
  ON users(floor_id)
  WHERE role = 'technician' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_assets_floor ON assets(floor_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_floor ON service_requests(floor_id);
