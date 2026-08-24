CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invitations (
    invitation_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    preferred_username VARCHAR(60),
    user_type VARCHAR(20) NOT NULL DEFAULT 'employee'
        CHECK (user_type IN ('employee','intern','corper','contractor','guest')),
    role VARCHAR(20) NOT NULL DEFAULT 'staff'
        CHECK (role IN ('admin','ict_officer','technician','staff')),
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    sponsor_name VARCHAR(150),
    supervisor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    invited_by_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    token_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','accepted','revoked','expired')),
    account_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    account_expiration_date DATE,
    accepted_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_invitation_dates CHECK (
        account_expiration_date IS NULL OR account_expiration_date >= account_start_date
    )
);

CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_email_ci ON invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) NOT NULL DEFAULT 'employee'
        CHECK (user_type IN ('employee','intern','corper','contractor','guest')),
    ADD COLUMN IF NOT EXISTS sponsor_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS supervisor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS account_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS account_expiration_date DATE,
    ADD COLUMN IF NOT EXISTS invitation_id INTEGER REFERENCES invitations(invitation_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS chk_users_account_dates;

ALTER TABLE users
    ADD CONSTRAINT chk_users_account_dates CHECK (
        account_expiration_date IS NULL OR account_expiration_date >= account_start_date
    );

CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_supervisor ON users(supervisor_user_id);
CREATE INDEX IF NOT EXISTS idx_users_account_expiration ON users(account_expiration_date);

CREATE TRIGGER trg_invitations_updated BEFORE UPDATE ON invitations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
