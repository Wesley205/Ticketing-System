ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS response_warning_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS resolution_warning_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS expected_completion_warning_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS expected_completion_escalated_at TIMESTAMP;

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
        'ticket_sla_warning',
        'ticket_overdue',
        'ticket_escalated',
        'maintenance_created',
        'maintenance_completed',
        'maintenance_due',
        'invitation_created',
        'account_expiry',
        'system'
    ));

CREATE INDEX IF NOT EXISTS idx_service_requests_sla_warning_monitor
    ON service_requests(status, response_warning_sent_at, resolution_warning_sent_at)
    WHERE is_archived = FALSE;
