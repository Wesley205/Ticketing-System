ALTER TABLE service_requests
    ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100),
    ADD COLUMN IF NOT EXISTS impact VARCHAR(20),
    ADD COLUMN IF NOT EXISTS urgency VARCHAR(20),
    ADD COLUMN IF NOT EXISTS source_channel VARCHAR(20) NOT NULL DEFAULT 'portal',
    ADD COLUMN IF NOT EXISTS resolution_summary VARCHAR(255),
    ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS sla_response_due_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS sla_resolution_due_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS closure_confirmation_required BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS reopen_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
    ADD COLUMN IF NOT EXISTS reopened_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE ticket_attachments
    ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS service_requests_status_check;

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_status;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_status
    CHECK (status IN (
        'New',
        'Pending',
        'Assigned',
        'Accepted',
        'In Progress',
        'Waiting for User',
        'Waiting for Parts',
        'Resolved',
        'Closed',
        'Reopened',
        'Cancelled'
    ));

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_impact;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_impact
    CHECK (impact IS NULL OR impact IN ('Low','Medium','High','Critical'));

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_urgency;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_urgency
    CHECK (urgency IS NULL OR urgency IN ('Low','Medium','High','Critical'));

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_source_channel;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_source_channel
    CHECK (source_channel IN ('portal','email','phone','walk-in','system'));

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_reopened_count;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_reopened_count
    CHECK (reopened_count >= 0);

ALTER TABLE service_requests
    DROP CONSTRAINT IF EXISTS chk_service_requests_resolution_dates;

ALTER TABLE service_requests
    ADD CONSTRAINT chk_service_requests_resolution_dates
    CHECK (
        closed_at IS NULL
        OR date_resolved IS NULL
        OR closed_at >= date_resolved
    );

UPDATE service_requests
SET status = CASE
    WHEN status = 'Pending' THEN 'New'
    ELSE status
END
WHERE status IN ('Pending', 'Assigned', 'In Progress', 'Resolved', 'Closed');

ALTER TABLE service_requests
    ALTER COLUMN status SET DEFAULT 'New';

UPDATE service_requests
SET impact = COALESCE(impact, priority),
    urgency = COALESCE(urgency, priority),
    resolution_summary = COALESCE(resolution_summary, LEFT(resolution, 255))
WHERE impact IS NULL
   OR urgency IS NULL
   OR (resolution_summary IS NULL AND resolution IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_service_requests_ticket_type_status
    ON service_requests(ticket_type, status);

CREATE INDEX IF NOT EXISTS idx_service_requests_source_channel
    ON service_requests(source_channel);

CREATE INDEX IF NOT EXISTS idx_service_requests_priority_impact_urgency
    ON service_requests(priority, impact, urgency);

CREATE INDEX IF NOT EXISTS idx_ticket_attachments_internal_request
    ON ticket_attachments(request_id, is_internal, created_at DESC);
