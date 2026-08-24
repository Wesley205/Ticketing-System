ALTER TABLE departments
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS ticket_number VARCHAR(30),
    ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(30) NOT NULL DEFAULT 'Incident',
    ADD COLUMN IF NOT EXISTS assigned_ict_officer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS affected_asset_id INTEGER REFERENCES assets(asset_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sla_policy_id INTEGER,
    ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS closed_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS closure_confirmed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_ticket_type;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_ticket_type
    CHECK (ticket_type IN ('Incident','Service Request','Access Request','Maintenance Request','Change Request'));

CREATE TABLE IF NOT EXISTS sla_policies (
    sla_policy_id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    ticket_type VARCHAR(30),
    priority VARCHAR(20) NOT NULL
        CHECK (priority IN ('Low','Medium','High','Critical')),
    response_target_hours INTEGER NOT NULL CHECK (response_target_hours > 0),
    resolution_target_hours INTEGER NOT NULL CHECK (resolution_target_hours > 0),
    escalation_threshold_hours INTEGER CHECK (escalation_threshold_hours IS NULL OR escalation_threshold_hours > 0),
    notification_recipients TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_sla_ticket_type CHECK (
        ticket_type IS NULL OR ticket_type IN ('Incident','Service Request','Access Request','Maintenance Request','Change Request')
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sla_policy_active_name ON sla_policies(LOWER(name));
CREATE INDEX IF NOT EXISTS idx_sla_policy_priority_active ON sla_policies(priority, is_active);

ALTER TABLE service_requests
    ADD CONSTRAINT fk_service_requests_sla_policy
    FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(sla_policy_id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ticket_comments (
    comment_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_requests(request_id) ON DELETE CASCADE,
    author_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    comment_body TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT chk_ticket_comments_nonblank CHECK (BTRIM(comment_body) <> '')
);

CREATE INDEX IF NOT EXISTS idx_ticket_comments_request_created ON ticket_comments(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_author ON ticket_comments(author_user_id);

CREATE TABLE IF NOT EXISTS ticket_history (
    history_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_requests(request_id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(40) NOT NULL,
    from_status VARCHAR(20),
    to_status VARCHAR(20),
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ticket_history_event_type CHECK (
        event_type IN ('created','assigned','reassigned','status_changed','resolved','closed','reopened','comment_added','archived','imported')
    )
);

CREATE INDEX IF NOT EXISTS idx_ticket_history_request_created ON ticket_history(request_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_history_actor ON ticket_history(actor_user_id);

CREATE TABLE IF NOT EXISTS ticket_attachments (
    attachment_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_requests(request_id) ON DELETE CASCADE,
    uploaded_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_request ON ticket_attachments(request_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_attachments_storage_key ON ticket_attachments(storage_key);

CREATE TABLE IF NOT EXISTS asset_assignments (
    assignment_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    assigned_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    assigned_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    returned_at TIMESTAMP,
    assignment_notes TEXT,
    return_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_asset_assignments_dates CHECK (
        returned_at IS NULL OR returned_at >= assigned_at
    ),
    CONSTRAINT chk_asset_assignments_state CHECK (
        (is_active = TRUE AND returned_at IS NULL) OR (is_active = FALSE)
    )
);

CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_created ON asset_assignments(asset_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_user_active ON asset_assignments(assigned_user_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_assignments_active_asset ON asset_assignments(asset_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    recipient_user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    related_record_type VARCHAR(50),
    related_record_id INTEGER,
    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP,
    CONSTRAINT chk_notifications_type CHECK (
        notification_type IN ('ticket_assigned','ticket_updated','ticket_resolved','maintenance_created','maintenance_completed','invitation_created','account_expiry','system')
    ),
    CONSTRAINT chk_notifications_read CHECK (
        (is_read = FALSE AND read_at IS NULL) OR (is_read = TRUE)
    )
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON notifications(recipient_user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_record ON notifications(related_record_type, related_record_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    assignment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    status_change_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    maintenance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_base_articles (
    article_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    summary TEXT,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','published','archived')),
    created_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    updated_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    published_at TIMESTAMP,
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_kb_nonblank_title CHECK (BTRIM(title) <> ''),
    CONSTRAINT chk_kb_nonblank_body CHECK (BTRIM(body) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_knowledge_base_slug_ci ON knowledge_base_articles(LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status_updated ON knowledge_base_articles(status, updated_at DESC);

DROP TRIGGER IF EXISTS trg_sla_policies_updated ON sla_policies;
CREATE TRIGGER trg_sla_policies_updated BEFORE UPDATE ON sla_policies
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_ticket_comments_updated ON ticket_comments;
CREATE TRIGGER trg_ticket_comments_updated BEFORE UPDATE ON ticket_comments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_asset_assignments_updated ON asset_assignments;
CREATE TRIGGER trg_asset_assignments_updated BEFORE UPDATE ON asset_assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_notifications_updated ON notifications;
CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_notification_preferences_updated ON notification_preferences;
CREATE TRIGGER trg_notification_preferences_updated BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_knowledge_base_articles_updated ON knowledge_base_articles;
CREATE TRIGGER trg_knowledge_base_articles_updated BEFORE UPDATE ON knowledge_base_articles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

UPDATE service_requests
SET ticket_number = 'NSC-' || TO_CHAR(COALESCE(date_submitted, created_at), 'YYYY') || '-' || LPAD(request_id::TEXT, 5, '0')
WHERE ticket_number IS NULL;

ALTER TABLE service_requests
    ALTER COLUMN ticket_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_service_requests_ticket_number_ci ON service_requests(LOWER(ticket_number));
CREATE INDEX IF NOT EXISTS idx_service_requests_department_status ON service_requests(department_id, status);
CREATE INDEX IF NOT EXISTS idx_service_requests_assigned_ict_officer ON service_requests(assigned_ict_officer_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_affected_asset ON service_requests(affected_asset_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_archived ON service_requests(is_archived, archived_at);

CREATE INDEX IF NOT EXISTS idx_assets_archived ON assets(is_archived, archived_at);
CREATE INDEX IF NOT EXISTS idx_departments_archived ON departments(is_archived, archived_at);

INSERT INTO notification_preferences (user_id)
SELECT u.user_id
FROM users u
LEFT JOIN notification_preferences np ON np.user_id = u.user_id
WHERE np.user_id IS NULL;

INSERT INTO asset_assignments (
    asset_id,
    assigned_user_id,
    assigned_department_id,
    assigned_by_user_id,
    assigned_at,
    assignment_notes,
    is_active
)
SELECT
    a.asset_id,
    a.assigned_to,
    a.department_id,
    NULL,
    COALESCE(a.updated_at, a.created_at, NOW()),
    'Backfilled from existing assets.assigned_to during Phase 4 migration',
    TRUE
FROM assets a
LEFT JOIN asset_assignments aa ON aa.asset_id = a.asset_id AND aa.is_active = TRUE
WHERE a.assigned_to IS NOT NULL
  AND aa.assignment_id IS NULL;

INSERT INTO ticket_history (
    request_id,
    actor_user_id,
    event_type,
    from_status,
    to_status,
    details,
    created_at
)
SELECT
    sr.request_id,
    sr.requester_id,
    'imported',
    NULL,
    sr.status,
    'Backfilled initial lifecycle event during Phase 4 migration',
    COALESCE(sr.date_submitted, sr.created_at, NOW())
FROM service_requests sr
LEFT JOIN ticket_history th ON th.request_id = sr.request_id
WHERE th.history_id IS NULL;

INSERT INTO sla_policies (
    name,
    ticket_type,
    priority,
    response_target_hours,
    resolution_target_hours,
    escalation_threshold_hours,
    notification_recipients,
    is_active
)
SELECT *
FROM (
    VALUES
        ('Default Critical SLA', 'Incident', 'Critical', 1, 4, 1, 'ICT Officer,Administrator', TRUE),
        ('Default High SLA', 'Incident', 'High', 4, 8, 4, 'ICT Officer', TRUE),
        ('Default Medium SLA', 'Incident', 'Medium', 8, 16, 8, 'ICT Officer', TRUE),
        ('Default Low SLA', 'Incident', 'Low', 24, 40, 16, 'ICT Officer', TRUE)
) AS defaults(name, ticket_type, priority, response_target_hours, resolution_target_hours, escalation_threshold_hours, notification_recipients, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM sla_policies existing WHERE LOWER(existing.name) = LOWER(defaults.name)
);
