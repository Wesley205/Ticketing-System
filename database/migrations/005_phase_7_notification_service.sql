ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS action_url VARCHAR(255);

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS chk_notifications_severity;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_severity CHECK (
        severity IN ('info', 'success', 'warning', 'error')
    );

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type CHECK (
        notification_type IN (
            'ticket_assigned',
            'ticket_updated',
            'ticket_resolved',
            'ticket_comment',
            'ticket_attachment',
            'ticket_overdue',
            'ticket_escalated',
            'maintenance_created',
            'maintenance_completed',
            'invitation_created',
            'account_expiry',
            'system'
        )
    );

ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS comment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS attachment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS sla_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS system_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS notification_deliveries (
    notification_delivery_id SERIAL PRIMARY KEY,
    notification_id INTEGER REFERENCES notifications(notification_id) ON DELETE CASCADE,
    recipient_user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    channel VARCHAR(20) NOT NULL,
    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    recipient_address VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body_text TEXT NOT NULL,
    provider_name VARCHAR(50),
    provider_message_id VARCHAR(255),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    queued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    next_attempt_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_attempt_at TIMESTAMP,
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_notification_deliveries_channel CHECK (
        channel IN ('email', 'sms', 'whatsapp')
    ),
    CONSTRAINT chk_notification_deliveries_status CHECK (
        delivery_status IN ('pending', 'processing', 'sent', 'failed', 'deferred', 'cancelled')
    ),
    CONSTRAINT chk_notification_deliveries_attempts CHECK (
        attempt_count >= 0 AND max_attempts > 0
    )
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_pending
    ON notification_deliveries(delivery_status, channel, next_attempt_at);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_recipient
    ON notification_deliveries(recipient_user_id, queued_at DESC);

DROP TRIGGER IF EXISTS trg_notification_deliveries_updated ON notification_deliveries;
CREATE TRIGGER trg_notification_deliveries_updated BEFORE UPDATE ON notification_deliveries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO notification_preferences (user_id)
SELECT u.user_id
FROM users u
LEFT JOIN notification_preferences np ON np.user_id = u.user_id
WHERE np.user_id IS NULL;
