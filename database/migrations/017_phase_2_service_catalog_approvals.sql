CREATE TABLE IF NOT EXISTS service_catalog_items (
  catalog_item_id SERIAL PRIMARY KEY,
  item_code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  ticket_type VARCHAR(40) NOT NULL,
  default_priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  approver_role VARCHAR(30),
  form_schema JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_catalog_ticket_type CHECK (ticket_type IN ('Incident', 'Service Request', 'Access Request', 'Maintenance Request', 'Change Request')),
  CONSTRAINT chk_catalog_priority CHECK (default_priority IN ('Low', 'Medium', 'High', 'Critical')),
  CONSTRAINT chk_catalog_approver_role CHECK (approver_role IS NULL OR approver_role IN ('admin', 'ict_officer')),
  CONSTRAINT chk_catalog_approval_config CHECK (approval_required = FALSE OR approver_role IS NOT NULL),
  CONSTRAINT chk_catalog_form_schema CHECK (jsonb_typeof(form_schema) = 'array')
);

INSERT INTO service_catalog_items
  (item_code, name, description, category, ticket_type, default_priority, approval_required, approver_role, form_schema, sort_order)
VALUES
  ('GENERAL-INCIDENT', 'Report an ICT issue', 'Report something that is broken, unavailable, or not working as expected.', 'Other', 'Incident', 'Medium', FALSE, NULL,
   '[{"key":"location","label":"Location","type":"text","required":true,"placeholder":"Building, floor, or room"}]'::jsonb, 10),
  ('PASSWORD-RESET', 'Password or account recovery', 'Request help restoring access to an existing account.', 'Software', 'Service Request', 'Medium', FALSE, NULL,
   '[{"key":"affected_system","label":"Affected system","type":"text","required":true,"placeholder":"Email, workstation, or application"}]'::jsonb, 20),
  ('ACCESS-REQUEST', 'Request system access', 'Request new or changed access to an ICT system or shared resource.', 'Software', 'Access Request', 'Medium', TRUE, 'ict_officer',
   '[{"key":"target_system","label":"System or resource","type":"text","required":true},{"key":"access_level","label":"Access needed","type":"text","required":true},{"key":"business_justification","label":"Business justification","type":"textarea","required":true}]'::jsonb, 30),
  ('SOFTWARE-INSTALL', 'Request software installation', 'Request approved software for an assigned workstation.', 'Software', 'Service Request', 'Low', TRUE, 'ict_officer',
   '[{"key":"software_name","label":"Software name","type":"text","required":true},{"key":"business_justification","label":"Business justification","type":"textarea","required":true}]'::jsonb, 40),
  ('EQUIPMENT-REQUEST', 'Request ICT equipment', 'Request a computer, peripheral, phone, or replacement device.', 'Hardware', 'Service Request', 'Medium', TRUE, 'admin',
   '[{"key":"requested_item","label":"Equipment needed","type":"text","required":true},{"key":"business_justification","label":"Business justification","type":"textarea","required":true}]'::jsonb, 50)
ON CONFLICT (item_code) DO NOTHING;

ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS catalog_item_id INTEGER REFERENCES service_catalog_items(catalog_item_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS catalog_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS approval_role VARCHAR(30),
  ADD COLUMN IF NOT EXISTS approval_decided_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_note TEXT;

ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS chk_service_requests_approval_status,
  DROP CONSTRAINT IF EXISTS chk_service_requests_approval_role,
  DROP CONSTRAINT IF EXISTS chk_service_requests_approval_decision;

ALTER TABLE service_requests
  ADD CONSTRAINT chk_service_requests_approval_status
    CHECK (approval_status IN ('not_required', 'pending', 'approved', 'rejected')),
  ADD CONSTRAINT chk_service_requests_approval_role
    CHECK (approval_role IS NULL OR approval_role IN ('admin', 'ict_officer')),
  ADD CONSTRAINT chk_service_requests_approval_decision
    CHECK (
      (approval_status IN ('not_required', 'pending') AND approval_decided_by IS NULL AND approval_decided_at IS NULL)
      OR (approval_status IN ('approved', 'rejected') AND approval_decided_by IS NOT NULL AND approval_decided_at IS NOT NULL)
    );

ALTER TABLE ticket_history DROP CONSTRAINT IF EXISTS chk_ticket_history_event;
ALTER TABLE ticket_history DROP CONSTRAINT IF EXISTS chk_ticket_history_event_type;
ALTER TABLE ticket_history DROP CONSTRAINT IF EXISTS ticket_history_event_type_check;
ALTER TABLE ticket_history ADD CONSTRAINT chk_ticket_history_event CHECK (event_type IN (
  'created', 'assigned', 'reassigned', 'unassigned', 'accepted', 'status_changed',
  'resolved', 'closed', 'reopened', 'comment_added', 'archived', 'imported',
  'sla_breached', 'escalated', 'approval_requested', 'approved', 'rejected'
));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notifications_type;
ALTER TABLE notifications ADD CONSTRAINT chk_notifications_type CHECK (notification_type IN (
  'ticket_assigned', 'ticket_updated', 'ticket_resolved', 'ticket_comment', 'ticket_attachment',
  'ticket_sla_warning', 'ticket_overdue', 'ticket_escalated', 'approval_requested',
  'approval_approved', 'approval_rejected', 'maintenance_created', 'maintenance_completed',
  'maintenance_due', 'invitation_created', 'account_expiry', 'system'
));

CREATE INDEX IF NOT EXISTS idx_service_catalog_active ON service_catalog_items(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_service_requests_approval_queue
  ON service_requests(approval_status, approval_role, date_submitted)
  WHERE approval_status = 'pending' AND is_archived = FALSE;
