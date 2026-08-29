-- Phase 6 authentication hardening.
-- Additive migration: no destructive data changes.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_account_status;

ALTER TABLE users
    ADD CONSTRAINT chk_users_account_status
        CHECK (account_status IN ('active','deactivated','suspended'));

UPDATE users
SET account_status = CASE
    WHEN is_active = FALSE THEN 'deactivated'
    ELSE account_status
END
WHERE account_status IS DISTINCT FROM CASE
    WHEN is_active = FALSE THEN 'deactivated'
    ELSE account_status
END;

CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    password_reset_token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_password_reset_token_usage CHECK (used_at IS NULL OR used_at >= created_at),
    CONSTRAINT chk_password_reset_token_expiry CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_created
    ON password_reset_tokens(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active
    ON password_reset_tokens(token_hash, expires_at)
    WHERE used_at IS NULL;

DROP TRIGGER IF EXISTS trg_password_reset_tokens_updated ON password_reset_tokens;
CREATE TRIGGER trg_password_reset_tokens_updated BEFORE UPDATE ON password_reset_tokens
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
