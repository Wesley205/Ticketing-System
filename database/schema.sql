-- NSC ICT Service Desk and Asset Management System
-- PostgreSQL Database Schema
-- Run this after creating the database, e.g.:
--   createdb nsc_ict_system
--   psql -d nsc_ict_system -f database/schema.sql

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS maintenance CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

-- DEPARTMENTS
CREATE TABLE departments (
    department_id   SERIAL PRIMARY KEY,
    name            VARCHAR(120) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- USERS  (roles: admin, ict_officer, technician, staff)
CREATE TABLE users (
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
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_department ON users(department_id);
CREATE UNIQUE INDEX idx_users_email_ci ON users(LOWER(email));
CREATE UNIQUE INDEX idx_users_username_ci ON users(LOWER(username));

-- ASSETS
CREATE TABLE assets (
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
CREATE INDEX idx_assets_status ON assets(status);
CREATE INDEX idx_assets_type ON assets(asset_type);
CREATE INDEX idx_assets_department ON assets(department_id);
CREATE INDEX idx_assets_assigned_to ON assets(assigned_to);

-- SERVICE REQUESTS
CREATE TABLE service_requests (
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
CREATE INDEX idx_sr_status ON service_requests(status);
CREATE INDEX idx_sr_priority ON service_requests(priority);
CREATE INDEX idx_sr_category ON service_requests(category);
CREATE INDEX idx_sr_technician ON service_requests(assigned_technician_id);
CREATE INDEX idx_sr_requester ON service_requests(requester_id);

-- MAINTENANCE (linked to assets)
CREATE TABLE maintenance (
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
CREATE INDEX idx_maint_asset ON maintenance(asset_id);
CREATE INDEX idx_maint_tech ON maintenance(technician_id);
CREATE INDEX idx_maint_status ON maintenance(status);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    log_id         SERIAL PRIMARY KEY,
    user_id        INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    action         VARCHAR(100) NOT NULL,
    record_type    VARCHAR(50),
    record_id      INTEGER,
    details        TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON assets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sr_updated BEFORE UPDATE ON service_requests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_maint_updated BEFORE UPDATE ON maintenance
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
