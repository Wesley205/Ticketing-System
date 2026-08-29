-- Authentication/session hardening.
-- Additive migration: no destructive data changes.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_failed_login_attempts;

ALTER TABLE users
    ADD CONSTRAINT chk_users_failed_login_attempts CHECK (failed_login_attempts >= 0);

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_session_version;

ALTER TABLE users
    ADD CONSTRAINT chk_users_session_version CHECK (session_version > 0);

CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_users_session_version ON users(user_id, session_version);
