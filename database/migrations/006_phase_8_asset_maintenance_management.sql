ALTER TABLE asset_assignments
    ADD COLUMN IF NOT EXISTS expected_return_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS returned_condition VARCHAR(20),
    ADD COLUMN IF NOT EXISTS returned_to_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

ALTER TABLE asset_assignments
    DROP CONSTRAINT IF EXISTS chk_asset_assignments_expected_return,
    DROP CONSTRAINT IF EXISTS chk_asset_assignments_returned_condition;

ALTER TABLE asset_assignments
    ADD CONSTRAINT chk_asset_assignments_expected_return
    CHECK (
        expected_return_at IS NULL OR expected_return_at >= assigned_at
    ),
    ADD CONSTRAINT chk_asset_assignments_returned_condition
    CHECK (
        returned_condition IS NULL OR returned_condition IN ('New','Good','Fair','Poor')
    );

CREATE TABLE IF NOT EXISTS asset_status_history (
    asset_status_history_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    previous_status VARCHAR(30),
    next_status VARCHAR(30) NOT NULL,
    reason TEXT,
    related_record_type VARCHAR(40),
    related_record_id INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_asset_status_history_status_values CHECK (
        (previous_status IS NULL OR previous_status IN ('Active','Available','Assigned','Under Maintenance','Damaged','Retired'))
        AND next_status IN ('Active','Available','Assigned','Under Maintenance','Damaged','Retired')
    )
);

CREATE INDEX IF NOT EXISTS idx_asset_status_history_asset_created
    ON asset_status_history(asset_id, created_at DESC);

CREATE TABLE IF NOT EXISTS maintenance_schedules (
    schedule_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    description TEXT,
    maintenance_type VARCHAR(30) NOT NULL DEFAULT 'Preventive',
    frequency_unit VARCHAR(20) NOT NULL DEFAULT 'days',
    frequency_value INTEGER NOT NULL DEFAULT 30,
    next_due_at TIMESTAMP NOT NULL,
    last_generated_at TIMESTAMP,
    last_completed_at TIMESTAMP,
    last_reminder_sent_at TIMESTAMP,
    assigned_technician_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reminder_days_before INTEGER NOT NULL DEFAULT 3,
    checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_maintenance_schedules_title CHECK (BTRIM(title) <> ''),
    CONSTRAINT chk_maintenance_schedules_type CHECK (
        maintenance_type IN ('Preventive','Inspection')
    ),
    CONSTRAINT chk_maintenance_schedules_frequency_unit CHECK (
        frequency_unit IN ('days','weeks','months')
    ),
    CONSTRAINT chk_maintenance_schedules_frequency_value CHECK (
        frequency_value > 0
    ),
    CONSTRAINT chk_maintenance_schedules_reminder CHECK (
        reminder_days_before >= 0
    )
);

CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_asset_active_due
    ON maintenance_schedules(asset_id, is_active, next_due_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_assignee
    ON maintenance_schedules(assigned_technician_id, is_active);

ALTER TABLE maintenance
    ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR(30) NOT NULL DEFAULT 'Corrective',
    ADD COLUMN IF NOT EXISTS related_request_id INTEGER REFERENCES service_requests(request_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES maintenance_schedules(schedule_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS completion_notes TEXT;

ALTER TABLE maintenance
    DROP CONSTRAINT IF EXISTS chk_maintenance_type,
    DROP CONSTRAINT IF EXISTS chk_maintenance_schedule_dates;

ALTER TABLE maintenance
    ADD CONSTRAINT chk_maintenance_type
    CHECK (
        maintenance_type IN ('Corrective','Preventive','Inspection')
    ),
    ADD CONSTRAINT chk_maintenance_schedule_dates
    CHECK (
        (started_at IS NULL OR scheduled_start_at IS NULL OR started_at >= scheduled_start_at)
        AND (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
    );

CREATE INDEX IF NOT EXISTS idx_maintenance_type_status
    ON maintenance(maintenance_type, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_related_request
    ON maintenance(related_request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_schedule
    ON maintenance(schedule_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_next_due
    ON maintenance(next_due_at, status);

DROP TRIGGER IF EXISTS trg_maintenance_schedules_updated ON maintenance_schedules;
CREATE TRIGGER trg_maintenance_schedules_updated BEFORE UPDATE ON maintenance_schedules
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
            'maintenance_due',
            'invitation_created',
            'account_expiry',
            'system'
        )
    );
