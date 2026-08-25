ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS assignment_notes TEXT,
    ADD COLUMN IF NOT EXISTS expected_completion_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS response_escalated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS resolution_escalated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS escalation_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_escalation_count;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_escalation_count
    CHECK (escalation_count >= 0);

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_expected_completion;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_expected_completion
    CHECK (
        expected_completion_at IS NULL
        OR assigned_at IS NULL
        OR expected_completion_at >= assigned_at
    );

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_accepted_at;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_accepted_at
    CHECK (
        accepted_at IS NULL
        OR assigned_at IS NULL
        OR accepted_at >= assigned_at
    );

ALTER TABLE ticket_history
    DROP CONSTRAINT IF EXISTS chk_ticket_history_event_type;

ALTER TABLE ticket_history
    ADD CONSTRAINT chk_ticket_history_event_type CHECK (
        event_type IN (
            'created',
            'assigned',
            'reassigned',
            'unassigned',
            'accepted',
            'status_changed',
            'resolved',
            'closed',
            'reopened',
            'comment_added',
            'archived',
            'imported',
            'sla_breached',
            'escalated'
        )
    );

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE notifications
    ADD CONSTRAINT chk_notifications_type CHECK (
        notification_type IN (
            'ticket_assigned',
            'ticket_updated',
            'ticket_resolved',
            'ticket_overdue',
            'ticket_escalated',
            'maintenance_created',
            'maintenance_completed',
            'invitation_created',
            'account_expiry',
            'system'
        )
    );

CREATE TABLE IF NOT EXISTS ticket_assignments (
    ticket_assignment_id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES service_requests(request_id) ON DELETE CASCADE,
    assigned_technician_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_ict_officer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    assignment_notes TEXT,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMP,
    expected_completion_at TIMESTAMP,
    ended_at TIMESTAMP,
    end_reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_ticket_assignments_acceptance CHECK (
        accepted_at IS NULL OR accepted_at >= assigned_at
    ),
    CONSTRAINT chk_ticket_assignments_expected_completion CHECK (
        expected_completion_at IS NULL OR expected_completion_at >= assigned_at
    ),
    CONSTRAINT chk_ticket_assignments_ended_at CHECK (
        ended_at IS NULL OR ended_at >= assigned_at
    )
);

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_request_created
    ON ticket_assignments(request_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_assignments_technician_active
    ON ticket_assignments(assigned_technician_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_assignments_active_request
    ON ticket_assignments(request_id) WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS trg_ticket_assignments_updated ON ticket_assignments;
CREATE TRIGGER trg_ticket_assignments_updated BEFORE UPDATE ON ticket_assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_service_requests_expected_completion
    ON service_requests(expected_completion_at);

CREATE INDEX IF NOT EXISTS idx_service_requests_response_due
    ON service_requests(sla_response_due_at);

CREATE INDEX IF NOT EXISTS idx_service_requests_resolution_due
    ON service_requests(sla_resolution_due_at);

CREATE INDEX IF NOT EXISTS idx_service_requests_escalation_monitor
    ON service_requests(status, assigned_technician_id, sla_response_due_at, sla_resolution_due_at);

UPDATE service_requests sr
SET assigned_by_user_id = COALESCE(sr.assigned_by_user_id, sr.assigned_ict_officer_id),
    assigned_at = COALESCE(sr.assigned_at, sr.status_changed_at, sr.updated_at, sr.created_at),
    accepted_at = CASE
        WHEN sr.accepted_at IS NOT NULL THEN sr.accepted_at
        WHEN sr.status IN ('Accepted', 'In Progress', 'Waiting for User', 'Waiting for Parts', 'Resolved', 'Closed')
             AND sr.assigned_technician_id IS NOT NULL
        THEN COALESCE(sr.first_response_at, sr.status_changed_at, sr.updated_at, sr.created_at)
        ELSE sr.accepted_at
    END
WHERE sr.assigned_technician_id IS NOT NULL;

INSERT INTO ticket_assignments (
    request_id,
    assigned_technician_id,
    assigned_ict_officer_id,
    assigned_by_user_id,
    assignment_notes,
    assigned_at,
    accepted_at,
    expected_completion_at,
    is_active
)
SELECT
    sr.request_id,
    sr.assigned_technician_id,
    sr.assigned_ict_officer_id,
    COALESCE(sr.assigned_by_user_id, sr.assigned_ict_officer_id),
    sr.assignment_notes,
    COALESCE(sr.assigned_at, sr.status_changed_at, sr.updated_at, sr.created_at, NOW()),
    sr.accepted_at,
    sr.expected_completion_at,
    CASE WHEN sr.status IN ('Closed', 'Cancelled') THEN FALSE ELSE TRUE END
FROM service_requests sr
LEFT JOIN ticket_assignments ta
    ON ta.request_id = sr.request_id AND ta.is_active = TRUE
WHERE sr.assigned_technician_id IS NOT NULL
  AND ta.ticket_assignment_id IS NULL;

UPDATE service_requests sr
SET sla_policy_id = sp.sla_policy_id
FROM sla_policies sp
WHERE sr.sla_policy_id IS NULL
  AND sp.is_active = TRUE
  AND sp.priority = sr.priority
  AND (
      sp.ticket_type = sr.ticket_type
      OR sp.ticket_type IS NULL
  )
  AND NOT EXISTS (
      SELECT 1
      FROM sla_policies sp_exact
      WHERE sp_exact.is_active = TRUE
        AND sp_exact.priority = sr.priority
        AND sp_exact.ticket_type = sr.ticket_type
        AND sp.ticket_type IS NULL
  );
