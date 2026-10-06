DROP INDEX IF EXISTS idx_service_requests_sla_warning_monitor;

ALTER TABLE service_requests
    DROP COLUMN IF EXISTS response_warning_sent_at,
    DROP COLUMN IF EXISTS resolution_warning_sent_at,
    DROP COLUMN IF EXISTS expected_completion_warning_sent_at,
    DROP COLUMN IF EXISTS expected_completion_escalated_at;

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
