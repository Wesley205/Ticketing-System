ALTER TABLE users
  ADD COLUMN IF NOT EXISTS technician_availability VARCHAR(20) NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS technician_capacity INTEGER NOT NULL DEFAULT 8;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_technician_availability;

ALTER TABLE users
  ADD CONSTRAINT chk_users_technician_availability
  CHECK (technician_availability IN ('available', 'busy', 'away', 'on_leave', 'offline'));

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS chk_users_technician_capacity;

ALTER TABLE users
  ADD CONSTRAINT chk_users_technician_capacity
  CHECK (technician_capacity BETWEEN 1 AND 50);

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS response_warning_level SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resolution_warning_level SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS expected_completion_warning_level SMALLINT NOT NULL DEFAULT 0;

UPDATE service_requests
SET response_warning_level = CASE WHEN response_warning_sent_at IS NOT NULL THEN 75 ELSE 0 END,
    resolution_warning_level = CASE WHEN resolution_warning_sent_at IS NOT NULL THEN 75 ELSE 0 END,
    expected_completion_warning_level = CASE WHEN expected_completion_warning_sent_at IS NOT NULL THEN 75 ELSE 0 END
WHERE response_warning_level = 0
   OR resolution_warning_level = 0
   OR expected_completion_warning_level = 0;

ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS chk_service_requests_response_warning_level,
  DROP CONSTRAINT IF EXISTS chk_service_requests_resolution_warning_level,
  DROP CONSTRAINT IF EXISTS chk_service_requests_completion_warning_level;

ALTER TABLE service_requests
  ADD CONSTRAINT chk_service_requests_response_warning_level
    CHECK (response_warning_level IN (0, 50, 75, 90)),
  ADD CONSTRAINT chk_service_requests_resolution_warning_level
    CHECK (resolution_warning_level IN (0, 50, 75, 90)),
  ADD CONSTRAINT chk_service_requests_completion_warning_level
    CHECK (expected_completion_warning_level IN (0, 50, 75, 90));

CREATE INDEX IF NOT EXISTS idx_users_technician_routing
  ON users(technician_availability, floor_id, technician_capacity)
  WHERE role = 'technician' AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_service_requests_operational_queue
  ON service_requests(status, assigned_technician_id, sla_resolution_due_at)
  WHERE is_archived = FALSE;
