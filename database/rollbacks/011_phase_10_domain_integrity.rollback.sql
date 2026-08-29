-- Roll back Phase 10 domain integrity constraints and supporting indexes.
-- This does not drop tables or delete application data.

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS chk_audit_logs_action_nonblank;

ALTER TABLE knowledge_base_articles
    DROP CONSTRAINT IF EXISTS chk_knowledge_base_articles_publish_state,
    DROP CONSTRAINT IF EXISTS chk_knowledge_base_articles_counters,
    DROP CONSTRAINT IF EXISTS chk_knowledge_base_articles_status;

ALTER TABLE notification_deliveries
    DROP CONSTRAINT IF EXISTS chk_notification_deliveries_timestamps,
    DROP CONSTRAINT IF EXISTS chk_notification_deliveries_attempts;

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE maintenance_schedules
    DROP CONSTRAINT IF EXISTS chk_maintenance_schedules_active_state;

ALTER TABLE maintenance
    DROP CONSTRAINT IF EXISTS chk_maintenance_status_timestamps,
    DROP CONSTRAINT IF EXISTS chk_maintenance_cost_nonnegative;

ALTER TABLE asset_assignments
    DROP CONSTRAINT IF EXISTS chk_asset_assignments_active_state;

ALTER TABLE ticket_assignments
    DROP CONSTRAINT IF EXISTS chk_ticket_assignments_active_state;

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_archive_state,
    DROP CONSTRAINT IF EXISTS chk_service_requests_lifecycle_dates,
    DROP CONSTRAINT IF EXISTS chk_service_requests_assignment_state,
    DROP CONSTRAINT IF EXISTS chk_service_requests_ticket_number_format;

ALTER TABLE departments
    DROP CONSTRAINT IF EXISTS chk_departments_archive_state;

ALTER TABLE assets
    DROP CONSTRAINT IF EXISTS chk_assets_archive_state,
    DROP CONSTRAINT IF EXISTS chk_assets_assignment_state,
    DROP CONSTRAINT IF EXISTS chk_assets_identity_nonblank;

ALTER TABLE invitations
    DROP CONSTRAINT IF EXISTS chk_invitations_status_timestamps,
    DROP CONSTRAINT IF EXISTS chk_invitations_temporary_account_requirements;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_account_state_alignment,
    DROP CONSTRAINT IF EXISTS chk_users_temporary_account_requirements;

DROP INDEX IF EXISTS idx_audit_logs_action_created_at;
DROP INDEX IF EXISTS idx_notifications_type_created_at;
DROP INDEX IF EXISTS idx_maintenance_status_schedule;
DROP INDEX IF EXISTS idx_assets_status_updated_at;
DROP INDEX IF EXISTS idx_service_requests_status_changed_at;
