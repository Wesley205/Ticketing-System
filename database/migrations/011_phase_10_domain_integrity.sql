-- Phase 10: domain consistency and database integrity.
-- This migration is intentionally non-destructive. Preflight checks raise clear
-- errors when existing rows need cleanup before constraints can be enforced.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM service_requests
        WHERE ticket_number IS NULL
           OR ticket_number !~ '^NSC-[0-9]{4}-[0-9]{5}$'
    ) THEN
        RAISE EXCEPTION 'Phase 10 preflight failed: service_requests.ticket_number must match NSC-YYYY-00000.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM users
        WHERE (user_type IN ('intern','corper','contractor','guest')
               AND (account_expiration_date IS NULL OR BTRIM(COALESCE(sponsor_name, '')) = ''))
           OR (is_active = TRUE AND (account_status <> 'active' OR deactivated_at IS NOT NULL))
           OR (is_active = FALSE AND (account_status NOT IN ('deactivated','suspended') OR deactivated_at IS NULL))
    ) THEN
        RAISE EXCEPTION 'Phase 10 preflight failed: users account lifecycle fields are inconsistent.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM assets
        WHERE BTRIM(asset_tag) = ''
           OR (serial_number IS NOT NULL AND BTRIM(serial_number) = '')
           OR (status = 'Assigned' AND assigned_to IS NULL)
           OR (is_archived = FALSE AND archived_at IS NOT NULL)
           OR (is_archived = TRUE AND archived_at IS NULL)
    ) THEN
        RAISE EXCEPTION 'Phase 10 preflight failed: assets contain invalid identity, assignment, or archive state.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM service_requests
        WHERE (status IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts') AND assigned_technician_id IS NULL)
           OR (date_resolved IS NOT NULL AND date_resolved < date_submitted)
           OR (closed_at IS NOT NULL AND closed_at < date_submitted)
           OR (closed_at IS NOT NULL AND date_resolved IS NOT NULL AND closed_at < date_resolved)
           OR (first_response_at IS NOT NULL AND first_response_at < date_submitted)
           OR (sla_response_due_at IS NOT NULL AND sla_response_due_at < date_submitted)
           OR (sla_resolution_due_at IS NOT NULL AND sla_response_due_at IS NOT NULL AND sla_resolution_due_at < sla_response_due_at)
           OR (closure_confirmed_at IS NOT NULL AND closed_at IS NOT NULL AND closure_confirmed_at < closed_at)
           OR (is_archived = FALSE AND archived_at IS NOT NULL)
           OR (is_archived = TRUE AND archived_at IS NULL)
    ) THEN
        RAISE EXCEPTION 'Phase 10 preflight failed: service_requests lifecycle, SLA, assignment, or archive fields are inconsistent.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM knowledge_base_articles
        WHERE status NOT IN ('draft','in_review','published','archived')
           OR view_count < 0
           OR helpful_count < 0
           OR not_helpful_count < 0
           OR usefulness_score < 0
           OR current_revision_number < 1
           OR (status = 'published' AND published_at IS NULL)
    ) THEN
        RAISE EXCEPTION 'Phase 10 preflight failed: knowledge_base_articles contain invalid status, counters, or publish timestamps.';
    END IF;
END $$;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_temporary_account_requirements;

ALTER TABLE users
    ADD CONSTRAINT chk_users_temporary_account_requirements
    CHECK (
        user_type NOT IN ('intern','corper','contractor','guest')
        OR (
            account_expiration_date IS NOT NULL
            AND BTRIM(COALESCE(sponsor_name, '')) <> ''
        )
    );

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_account_state_alignment;

ALTER TABLE users
    ADD CONSTRAINT chk_users_account_state_alignment
    CHECK (
        (
            is_active = TRUE
            AND account_status = 'active'
            AND deactivated_at IS NULL
        )
        OR (
            is_active = FALSE
            AND account_status IN ('deactivated','suspended')
            AND deactivated_at IS NOT NULL
        )
    );

ALTER TABLE invitations
    DROP CONSTRAINT IF EXISTS chk_invitations_temporary_account_requirements;

ALTER TABLE invitations
    ADD CONSTRAINT chk_invitations_temporary_account_requirements
    CHECK (
        user_type NOT IN ('intern','corper','contractor','guest')
        OR (
            account_expiration_date IS NOT NULL
            AND BTRIM(COALESCE(sponsor_name, '')) <> ''
        )
    );

ALTER TABLE invitations
    DROP CONSTRAINT IF EXISTS chk_invitations_status_timestamps;

ALTER TABLE invitations
    ADD CONSTRAINT chk_invitations_status_timestamps
    CHECK (
        (status <> 'accepted' OR accepted_at IS NOT NULL)
        AND (status <> 'revoked' OR revoked_at IS NOT NULL)
    );

ALTER TABLE assets
    DROP CONSTRAINT IF EXISTS chk_assets_identity_nonblank;

ALTER TABLE assets
    ADD CONSTRAINT chk_assets_identity_nonblank
    CHECK (
        BTRIM(asset_tag) <> ''
        AND (serial_number IS NULL OR BTRIM(serial_number) <> '')
    );

ALTER TABLE assets
    DROP CONSTRAINT IF EXISTS chk_assets_assignment_state;

ALTER TABLE assets
    ADD CONSTRAINT chk_assets_assignment_state
    CHECK (status <> 'Assigned' OR assigned_to IS NOT NULL);

ALTER TABLE assets
    DROP CONSTRAINT IF EXISTS chk_assets_archive_state;

ALTER TABLE assets
    ADD CONSTRAINT chk_assets_archive_state
    CHECK (
        (is_archived = FALSE AND archived_at IS NULL)
        OR (is_archived = TRUE AND archived_at IS NOT NULL)
    );

ALTER TABLE departments
    DROP CONSTRAINT IF EXISTS chk_departments_archive_state;

ALTER TABLE departments
    ADD CONSTRAINT chk_departments_archive_state
    CHECK (
        (is_archived = FALSE AND archived_at IS NULL)
        OR (is_archived = TRUE AND archived_at IS NOT NULL)
    );

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_ticket_number_format;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_ticket_number_format
    CHECK (ticket_number IS NOT NULL AND ticket_number ~ '^NSC-[0-9]{4}-[0-9]{5}$');

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_assignment_state;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_assignment_state
    CHECK (
        status NOT IN ('Assigned','Accepted','In Progress','Waiting for User','Waiting for Parts')
        OR assigned_technician_id IS NOT NULL
    );

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_lifecycle_dates;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_lifecycle_dates
    CHECK (
        (date_resolved IS NULL OR date_resolved >= date_submitted)
        AND (closed_at IS NULL OR closed_at >= date_submitted)
        AND (closed_at IS NULL OR date_resolved IS NULL OR closed_at >= date_resolved)
        AND (first_response_at IS NULL OR first_response_at >= date_submitted)
        AND (sla_response_due_at IS NULL OR sla_response_due_at >= date_submitted)
        AND (sla_resolution_due_at IS NULL OR sla_response_due_at IS NULL OR sla_resolution_due_at >= sla_response_due_at)
        AND (closure_confirmed_at IS NULL OR closed_at IS NULL OR closure_confirmed_at >= closed_at)
    );

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_archive_state;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_archive_state
    CHECK (
        (is_archived = FALSE AND archived_at IS NULL)
        OR (is_archived = TRUE AND archived_at IS NOT NULL)
    );

ALTER TABLE ticket_assignments
    DROP CONSTRAINT IF EXISTS chk_ticket_assignments_active_state;

ALTER TABLE ticket_assignments
    ADD CONSTRAINT chk_ticket_assignments_active_state
    CHECK (
        (is_active = FALSE OR ended_at IS NULL)
        AND (is_active = FALSE OR assigned_technician_id IS NOT NULL)
    );

ALTER TABLE asset_assignments
    DROP CONSTRAINT IF EXISTS chk_asset_assignments_active_state;

ALTER TABLE asset_assignments
    ADD CONSTRAINT chk_asset_assignments_active_state
    CHECK (
        (is_active = TRUE AND returned_at IS NULL)
        OR (is_active = FALSE AND returned_at IS NOT NULL)
    );

ALTER TABLE maintenance
    DROP CONSTRAINT IF EXISTS chk_maintenance_cost_nonnegative;

ALTER TABLE maintenance
    ADD CONSTRAINT chk_maintenance_cost_nonnegative
    CHECK (cost >= 0);

ALTER TABLE maintenance
    DROP CONSTRAINT IF EXISTS chk_maintenance_status_timestamps;

ALTER TABLE maintenance
    ADD CONSTRAINT chk_maintenance_status_timestamps
    CHECK (
        (status <> 'In Progress' OR started_at IS NOT NULL)
        AND (status <> 'Completed' OR completed_at IS NOT NULL)
        AND (started_at IS NULL OR scheduled_start_at IS NULL OR started_at >= scheduled_start_at)
        AND (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
    );

ALTER TABLE maintenance_schedules
    DROP CONSTRAINT IF EXISTS chk_maintenance_schedules_active_state;

ALTER TABLE maintenance_schedules
    ADD CONSTRAINT chk_maintenance_schedules_active_state
    CHECK (
        (is_active = TRUE AND archived_at IS NULL)
        OR (is_active = FALSE AND archived_at IS NOT NULL)
    );

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type
    CHECK (notification_type IN (
        'ticket_assigned',
        'ticket_updated',
        'ticket_resolved',
        'ticket_comment',
        'ticket_attachment',
        'ticket_overdue',
        'ticket_escalated',
        'maintenance_created',
        'maintenance_completed',
        'maintenance_due',
        'invitation_created',
        'account_expiry',
        'system'
    ));

ALTER TABLE notification_deliveries
    DROP CONSTRAINT IF EXISTS chk_notification_deliveries_attempts;

ALTER TABLE notification_deliveries
    ADD CONSTRAINT chk_notification_deliveries_attempts
    CHECK (attempt_count >= 0);

ALTER TABLE notification_deliveries
    DROP CONSTRAINT IF EXISTS chk_notification_deliveries_timestamps;

ALTER TABLE notification_deliveries
    ADD CONSTRAINT chk_notification_deliveries_timestamps
    CHECK (
        (sent_at IS NULL OR sent_at >= queued_at)
        AND (failed_at IS NULL OR failed_at >= queued_at)
        AND (last_attempt_at IS NULL OR last_attempt_at >= queued_at)
    );

ALTER TABLE knowledge_base_articles
    DROP CONSTRAINT IF EXISTS knowledge_base_articles_status_check;

ALTER TABLE knowledge_base_articles
    DROP CONSTRAINT IF EXISTS chk_knowledge_base_articles_status;

ALTER TABLE knowledge_base_articles
    ADD CONSTRAINT chk_knowledge_base_articles_status
    CHECK (status IN ('draft','in_review','published','archived'));

ALTER TABLE knowledge_base_articles
    DROP CONSTRAINT IF EXISTS chk_knowledge_base_articles_counters;

ALTER TABLE knowledge_base_articles
    ADD CONSTRAINT chk_knowledge_base_articles_counters
    CHECK (
        view_count >= 0
        AND helpful_count >= 0
        AND not_helpful_count >= 0
        AND usefulness_score >= 0
        AND current_revision_number >= 1
    );

ALTER TABLE knowledge_base_articles
    DROP CONSTRAINT IF EXISTS chk_knowledge_base_articles_publish_state;

ALTER TABLE knowledge_base_articles
    ADD CONSTRAINT chk_knowledge_base_articles_publish_state
    CHECK (status <> 'published' OR published_at IS NOT NULL);

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS chk_audit_logs_action_nonblank;

ALTER TABLE audit_logs
    ADD CONSTRAINT chk_audit_logs_action_nonblank
    CHECK (
        BTRIM(action) <> ''
        AND (record_type IS NULL OR BTRIM(record_type) <> '')
    );

CREATE INDEX IF NOT EXISTS idx_service_requests_status_changed_at
    ON service_requests(status, status_changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_assets_status_updated_at
    ON assets(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_status_schedule
    ON maintenance(status, scheduled_start_at, maintenance_date);

CREATE INDEX IF NOT EXISTS idx_notifications_type_created_at
    ON notifications(notification_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at
    ON audit_logs(action, created_at DESC);
