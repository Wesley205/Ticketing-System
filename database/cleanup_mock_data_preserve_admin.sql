-- NSC ICT Service Desk mock-data cleanup.
--
-- Purpose:
--   Remove development/mock seed data and runtime test artifacts while keeping
--   the administrator login account for real-world testing.
--
-- Usage:
--   psql -U postgres -d nsc_ict_system -f database/cleanup_mock_data_preserve_admin.sql
--
-- Preserved:
--   - users.username = 'admin'
--   - one clean notification_preferences row for the admin user
--   - schema_migrations, because it records applied database migrations
--
-- Removed:
--   - all other users
--   - seeded departments, invitations, SLA policies, assets, tickets,
--     maintenance records, notifications, knowledge-base records, audit logs,
--     password reset tokens, and operational job run rows

BEGIN;

-- Refuse to run if the account that must be preserved is missing.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin') THEN
    RAISE EXCEPTION 'Cleanup aborted: users.username = admin was not found.';
  END IF;
END $$;

CREATE TEMP TABLE _nsc_preserved_admin AS
SELECT user_id
FROM users
WHERE username = 'admin';

-- Child/detail tables first.
DELETE FROM notification_deliveries;
DELETE FROM password_reset_tokens;
DELETE FROM knowledge_base_article_feedback;
DELETE FROM knowledge_base_article_relations;
DELETE FROM knowledge_base_article_revisions;
DELETE FROM ticket_attachments;
DELETE FROM ticket_comments;
DELETE FROM ticket_history;
DELETE FROM ticket_assignments;
DELETE FROM asset_status_history;
DELETE FROM asset_assignments;

-- Main operational records.
DELETE FROM notifications;
DELETE FROM knowledge_base_articles;
DELETE FROM maintenance;
DELETE FROM maintenance_schedules;
DELETE FROM service_requests;
DELETE FROM assets;
DELETE FROM invitations;
DELETE FROM sla_policies;
DELETE FROM audit_logs;
DELETE FROM operational_job_runs;

-- Keep only the admin notification preference. Recreate it if it was absent.
DELETE FROM notification_preferences
WHERE user_id NOT IN (SELECT user_id FROM _nsc_preserved_admin);

INSERT INTO notification_preferences
  (user_id, in_app_enabled, email_enabled, assignment_enabled,
   status_change_enabled, maintenance_enabled, comment_enabled,
   attachment_enabled, sla_enabled, system_enabled)
SELECT user_id, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM _nsc_preserved_admin
ON CONFLICT (user_id) DO UPDATE SET
  in_app_enabled = EXCLUDED.in_app_enabled,
  email_enabled = EXCLUDED.email_enabled,
  assignment_enabled = EXCLUDED.assignment_enabled,
  status_change_enabled = EXCLUDED.status_change_enabled,
  maintenance_enabled = EXCLUDED.maintenance_enabled,
  comment_enabled = EXCLUDED.comment_enabled,
  attachment_enabled = EXCLUDED.attachment_enabled,
  sla_enabled = EXCLUDED.sla_enabled,
  system_enabled = EXCLUDED.system_enabled,
  updated_at = NOW();

-- Remove every non-admin user and detach the admin from seeded departments.
UPDATE users
SET department_id = NULL,
    is_active = TRUE,
    account_status = 'active',
    failed_login_attempts = 0,
    locked_until = NULL,
    last_failed_login_at = NULL,
    deactivated_at = NULL,
    deactivation_reason = NULL,
    account_expiration_date = NULL,
    sponsor_name = NULL,
    supervisor_user_id = NULL
WHERE user_id IN (SELECT user_id FROM _nsc_preserved_admin);

DELETE FROM users
WHERE user_id NOT IN (SELECT user_id FROM _nsc_preserved_admin);

-- Departments are seed/reference mock data in this project. Recreate real
-- departments during real-world testing through the application.
DELETE FROM departments;

-- Keep serial sequences aligned with the rows that remain. Empty tables restart
-- from 1; the users sequence continues after the preserved admin user_id.
DO $$
DECLARE
  seq_record RECORD;
  max_value BIGINT;
BEGIN
  FOR seq_record IN
    SELECT
      table_schema,
      table_name,
      column_name,
      pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) AS sequence_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND pg_get_serial_sequence(format('%I.%I', table_schema, table_name), column_name) IS NOT NULL
  LOOP
    EXECUTE format(
      'SELECT MAX(%I)::BIGINT FROM %I.%I',
      seq_record.column_name,
      seq_record.table_schema,
      seq_record.table_name
    )
    INTO max_value;

    IF max_value IS NULL THEN
      EXECUTE 'SELECT setval($1, 1, false)' USING seq_record.sequence_name;
    ELSE
      EXECUTE 'SELECT setval($1, $2, true)' USING seq_record.sequence_name, max_value;
    END IF;
  END LOOP;
END $$;

DROP TABLE _nsc_preserved_admin;

COMMIT;

-- Verification: this should return exactly one row, the admin account.
SELECT user_id, username, role, user_type, is_active, account_status
FROM users
ORDER BY user_id;
