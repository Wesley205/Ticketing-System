-- Bootstrap foundation schema for empty databases.
-- This migration is intentionally non-destructive and must remain safe to run
-- against databases that already have the original Phase 1 tables.

CREATE TABLE IF NOT EXISTS departments (
    department_id   SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    user_id         SERIAL PRIMARY KEY,
    full_name       VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    username        VARCHAR(60)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20)  NOT NULL DEFAULT 'staff'
                        CHECK (role IN ('admin','ict_officer','technician','staff')),
    department_id   INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    phone           VARCHAR(30),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci ON users(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_ci ON users(LOWER(username));

CREATE TABLE IF NOT EXISTS assets (
    asset_id        SERIAL PRIMARY KEY,
    asset_tag       VARCHAR(50) NOT NULL UNIQUE,
    asset_type      VARCHAR(50) NOT NULL
                        CHECK (asset_type IN ('Laptop','Desktop','Printer','Scanner','Router',
                                               'Switch','Server','Monitor','UPS','Projector','Other')),
    brand           VARCHAR(100),
    model           VARCHAR(100),
    serial_number   VARCHAR(100) UNIQUE,
    department_id   INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    assigned_to     INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    purchase_date   DATE,
    condition       VARCHAR(20) NOT NULL DEFAULT 'Good'
                        CHECK (condition IN ('New','Good','Fair','Poor')),
    status          VARCHAR(30) NOT NULL DEFAULT 'Available'
                        CHECK (status IN ('Active','Available','Assigned','Under Maintenance','Damaged','Retired')),
    location        VARCHAR(150),
    description     TEXT,
    date_added      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);

CREATE TABLE IF NOT EXISTS service_requests (
    request_id          SERIAL PRIMARY KEY,
    requester_id         INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    department_id         INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    category             VARCHAR(30) NOT NULL
                            CHECK (category IN ('Computer','Network','Printer','Internet','Software','Email','Hardware','Other')),
    subject               VARCHAR(200) NOT NULL,
    description           TEXT NOT NULL,
    priority              VARCHAR(20) NOT NULL DEFAULT 'Medium'
                            CHECK (priority IN ('Low','Medium','High','Critical')),
    status                VARCHAR(20) NOT NULL DEFAULT 'Pending'
                            CHECK (status IN ('Pending','Assigned','In Progress','Resolved','Closed')),
    assigned_technician_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    resolution            TEXT,
    date_submitted        TIMESTAMP NOT NULL DEFAULT NOW(),
    date_resolved         TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_sr_priority ON service_requests(priority);
CREATE INDEX IF NOT EXISTS idx_sr_category ON service_requests(category);
CREATE INDEX IF NOT EXISTS idx_sr_technician ON service_requests(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_sr_requester ON service_requests(requester_id);

CREATE TABLE IF NOT EXISTS maintenance (
    maintenance_id   SERIAL PRIMARY KEY,
    asset_id         INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    technician_id    INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    problem          TEXT NOT NULL,
    action_taken     TEXT,
    maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cost             NUMERIC(12,2) DEFAULT 0,
    status           VARCHAR(20) NOT NULL DEFAULT 'Scheduled'
                        CHECK (status IN ('Scheduled','In Progress','Completed','Cancelled')),
    notes            TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_asset ON maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_maint_tech ON maintenance(technician_id);
CREATE INDEX IF NOT EXISTS idx_maint_status ON maintenance(status);

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id         SERIAL PRIMARY KEY,
    user_id        INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action         VARCHAR(100) NOT NULL,
    record_type    VARCHAR(50),
    record_id      INTEGER,
    details        TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_departments_updated') THEN
    CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated') THEN
    CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_assets_updated') THEN
    CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON assets
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sr_updated') THEN
    CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON service_requests
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_maint_updated') THEN
    CREATE TRIGGER trg_maint_updated BEFORE UPDATE ON maintenance
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
