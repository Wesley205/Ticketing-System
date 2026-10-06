-- Browser push notification support.
-- Additive migration: preserves the existing in-app notification source of truth.

ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS browser_push_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS browser_push_subscriptions (
    browser_subscription_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_browser_push_subscriptions_user_active
    ON browser_push_subscriptions(user_id, is_active, created_at DESC);

DROP TRIGGER IF EXISTS trg_browser_push_subscriptions_updated ON browser_push_subscriptions;
CREATE TRIGGER trg_browser_push_subscriptions_updated BEFORE UPDATE ON browser_push_subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE notification_deliveries
    DROP CONSTRAINT IF EXISTS chk_notification_deliveries_channel;

ALTER TABLE notification_deliveries
    ADD CONSTRAINT chk_notification_deliveries_channel CHECK (
        channel IN ('email', 'sms', 'whatsapp', 'browser_push')
    );
