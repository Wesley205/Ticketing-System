-- NSC ICT Service Desk minimal role seed data.
--
-- Run after applying all migrations:
--   psql -U nsc_app -d nsc_ict_system -f database/seed.sql
--
-- Admin login:
--   Username: admin
--   Password: Password123!
-- ICT officer login:
--   Username: officer
--   Password: Password123!
-- Technician login:
--   Username: technician
--   Password: Password123!
--
-- This file is intended for local development/test databases only.
-- After this account seed, run `npm run seed:knowledge-base` from backend
-- to install the five general support articles and their protected images.

BEGIN;

INSERT INTO departments (name, description, is_archived)
VALUES ('ICT', 'ICT service operations and system administration', FALSE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_archived = FALSE,
    archived_at = NULL,
    archive_reason = NULL;

INSERT INTO users (
  full_name,
  email,
  username,
  password_hash,
  role,
  user_type,
  department_id,
  phone,
  is_active,
  account_status,
  account_start_date,
  account_expiration_date,
  deactivated_at,
  deactivation_reason
)
SELECT
  'Test Admin',
  'test.admin@nscict.local',
  'admin',
  '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO',
  'admin',
  'employee',
  d.department_id,
  '08000000001',
  TRUE,
  'active',
  CURRENT_DATE,
  NULL,
  NULL,
  NULL
FROM departments d
WHERE d.name = 'ICT'
ON CONFLICT (username) DO UPDATE
SET full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    department_id = EXCLUDED.department_id,
    phone = EXCLUDED.phone,
    is_active = TRUE,
    account_status = 'active',
    account_start_date = COALESCE(users.account_start_date, CURRENT_DATE),
    account_expiration_date = NULL,
    deactivated_at = NULL,
    deactivation_reason = NULL;

INSERT INTO users (
  full_name,
  email,
  username,
  password_hash,
  role,
  user_type,
  department_id,
  phone,
  is_active,
  account_status,
  account_start_date,
  account_expiration_date,
  deactivated_at,
  deactivation_reason
)
SELECT
  seeded.full_name,
  seeded.email,
  seeded.username,
  '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO',
  seeded.role,
  'employee',
  d.department_id,
  seeded.phone,
  TRUE,
  'active',
  CURRENT_DATE,
  NULL,
  NULL,
  NULL
FROM departments d
CROSS JOIN (
  VALUES
    ('Test ICT Officer', 'test.officer@nscict.local', 'officer', 'ict_officer', '08000000002'),
    ('Test Technician', 'test.technician@nscict.local', 'technician', 'technician', '08000000003')
) AS seeded(full_name, email, username, role, phone)
WHERE d.name = 'ICT'
ON CONFLICT (username) DO UPDATE
SET full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    user_type = EXCLUDED.user_type,
    department_id = EXCLUDED.department_id,
    phone = EXCLUDED.phone,
    is_active = TRUE,
    account_status = 'active',
    account_start_date = COALESCE(users.account_start_date, CURRENT_DATE),
    account_expiration_date = NULL,
    deactivated_at = NULL,
    deactivation_reason = NULL;

INSERT INTO notification_preferences (user_id)
SELECT user_id
FROM users
WHERE username IN ('admin', 'officer', 'technician')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO audit_logs (user_id, action, record_type, record_id, details)
SELECT
  user_id,
  'Admin seed loaded',
  'system',
  NULL,
  'Admin, ICT officer, and technician seed initialized.'
FROM users
WHERE username = 'admin';

COMMIT;

SELECT user_id, full_name, email, username, role, user_type, is_active, account_status
FROM users
WHERE username IN ('admin', 'officer', 'technician')
ORDER BY username;
