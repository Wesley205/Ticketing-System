DROP INDEX IF EXISTS idx_service_requests_operational_queue;
DROP INDEX IF EXISTS idx_users_technician_routing;

ALTER TABLE service_requests
  DROP COLUMN IF EXISTS expected_completion_warning_level,
  DROP COLUMN IF EXISTS resolution_warning_level,
  DROP COLUMN IF EXISTS response_warning_level;

ALTER TABLE users
  DROP COLUMN IF EXISTS technician_capacity,
  DROP COLUMN IF EXISTS technician_availability;
