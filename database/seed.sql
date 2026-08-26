-- NSC ICT Service Desk development seed data.
--
-- Run after applying all migrations:
--   psql -U postgres -d nsc_ict_system -f database/seed.sql
--
-- Shared password for every active seeded account:
--   Password123!
--
-- Invitation test tokens:
--   EMP-INVITE-2026-ALPHA
--   TEMP-CONTRACT-2026-BETA
--
-- This file is intended for local development/test databases only.

BEGIN;

-- Departments ----------------------------------------------------------------
INSERT INTO departments (name, description, is_archived)
VALUES
  ('ICT', 'Information and Communication Technology operations', FALSE),
  ('Finance', 'Finance and accounting department', FALSE),
  ('Human Resources', 'People and organizational services', FALSE),
  ('Operations', 'Operations and field support', FALSE),
  ('Administration', 'Corporate administration', FALSE),
  ('Marine Engineering', 'Vessel and engineering technical support', FALSE)
ON CONFLICT (name) DO UPDATE
SET description = EXCLUDED.description,
    is_archived = FALSE,
    archived_at = NULL,
    archive_reason = NULL;

-- Users ----------------------------------------------------------------------
-- role controls access. user_type controls employee/temporary lifecycle.
INSERT INTO users
  (full_name, email, username, password_hash, role, user_type, department_id,
   phone, is_active, sponsor_name, account_start_date, account_expiration_date,
   deactivated_at, deactivation_reason)
SELECT
  v.full_name,
  v.email,
  v.username,
  v.password_hash,
  v.role,
  v.user_type,
  d.department_id,
  v.phone,
  v.is_active,
  v.sponsor_name,
  v.account_start_date::date,
  v.account_expiration_date::date,
  CASE WHEN v.is_active THEN NULL ELSE NOW() - INTERVAL '2 days' END,
  CASE WHEN v.is_active THEN NULL ELSE 'Seeded inactive account for lifecycle testing' END
FROM (VALUES
  ('Test Admin', 'test.admin@nscict.local', 'admin', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'admin', 'employee', 'ICT', '08000000001', TRUE, NULL, CURRENT_DATE, NULL),
  ('Ibrahim Musa', 'ibrahim.musa@nscict.local', 'ibrahim.musa', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'ict_officer', 'employee', 'ICT', '08000000002', TRUE, NULL, CURRENT_DATE, NULL),
  ('Grace Eke', 'grace.eke@nscict.local', 'grace.eke', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'ict_officer', 'employee', 'ICT', '08000000003', TRUE, NULL, CURRENT_DATE, NULL),
  ('Chinedu Obi', 'chinedu.obi@nscict.local', 'chinedu.obi', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'technician', 'employee', 'ICT', '08000000004', TRUE, NULL, CURRENT_DATE, NULL),
  ('Fatima Bello', 'fatima.bello@nscict.local', 'fatima.bello', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'technician', 'employee', 'ICT', '08000000005', TRUE, NULL, CURRENT_DATE, NULL),
  ('Segun Adewale', 'segun.adewale@nscict.local', 'segun.adewale', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'technician', 'employee', 'ICT', '08000000006', TRUE, NULL, CURRENT_DATE, NULL),
  ('Ngozi Umeh', 'ngozi.umeh@nscict.local', 'ngozi.umeh', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 'employee', 'Finance', '08000000007', TRUE, NULL, CURRENT_DATE, NULL),
  ('Tunde Bakare', 'tunde.bakare@nscict.local', 'tunde.bakare', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 'employee', 'Operations', '08000000008', TRUE, NULL, CURRENT_DATE, NULL),
  ('Blessing Nnamdi', 'blessing.nnamdi@nscict.local', 'blessing.nnamdi', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 'employee', 'Human Resources', '08000000009', TRUE, NULL, CURRENT_DATE, NULL),
  ('Emeka Nwosu', 'emeka.nwosu@nscict.local', 'emeka.nwosu', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 'employee', 'Marine Engineering', '08000000010', TRUE, NULL, CURRENT_DATE, NULL),
  ('Daniel Okoro', 'daniel.intern@example.com', 'daniel.intern', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 'intern', 'Administration', '08000000011', TRUE, 'Ibrahim Musa', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '80 days'),
  ('Aisha Lawal', 'aisha.contractor@example.com', 'aisha.contractor', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'technician', 'contractor', 'ICT', '08000000012', TRUE, 'Grace Eke', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '45 days'),
  ('Peter Ojo', 'peter.ojo@nscict.local', 'peter.ojo', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 'employee', 'Finance', '08000000013', FALSE, NULL, CURRENT_DATE - INTERVAL '120 days', NULL),
  ('Future Corper', 'future.corper@example.com', 'future.corper', '$2b$12$x32xrKBkJvN6zl5WsKwgKuGX1uBADOv4TdGCXW5ZfLVLb0KZwl4NO', 'staff', 'corper', 'Operations', '08000000014', TRUE, 'Ngozi Umeh', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '180 days')
) AS v(full_name, email, username, password_hash, role, user_type, department_name, phone, is_active, sponsor_name, account_start_date, account_expiration_date)
JOIN departments d ON d.name = v.department_name
ON CONFLICT (username) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  user_type = EXCLUDED.user_type,
  department_id = EXCLUDED.department_id,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  sponsor_name = EXCLUDED.sponsor_name,
  account_start_date = EXCLUDED.account_start_date,
  account_expiration_date = EXCLUDED.account_expiration_date,
  deactivated_at = EXCLUDED.deactivated_at,
  deactivation_reason = EXCLUDED.deactivation_reason;

-- Notification preferences ---------------------------------------------------
INSERT INTO notification_preferences
  (user_id, in_app_enabled, email_enabled, assignment_enabled,
   status_change_enabled, maintenance_enabled, comment_enabled,
   attachment_enabled, sla_enabled, system_enabled)
SELECT user_id, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
FROM users
WHERE username IN (
  'admin', 'ibrahim.musa', 'grace.eke', 'chinedu.obi', 'fatima.bello',
  'segun.adewale', 'ngozi.umeh', 'tunde.bakare', 'blessing.nnamdi',
  'emeka.nwosu', 'daniel.intern', 'aisha.contractor'
)
ON CONFLICT (user_id) DO UPDATE SET
  in_app_enabled = EXCLUDED.in_app_enabled,
  assignment_enabled = EXCLUDED.assignment_enabled,
  status_change_enabled = EXCLUDED.status_change_enabled,
  maintenance_enabled = EXCLUDED.maintenance_enabled,
  comment_enabled = EXCLUDED.comment_enabled,
  attachment_enabled = EXCLUDED.attachment_enabled,
  sla_enabled = EXCLUDED.sla_enabled,
  system_enabled = EXCLUDED.system_enabled;

-- Invitations ----------------------------------------------------------------
INSERT INTO invitations
  (full_name, email, preferred_username, user_type, role, department_id,
   sponsor_name, invited_by_user_id, token_hash, status, account_start_date,
   account_expiration_date, expires_at, revoked_at)
SELECT
  v.full_name,
  v.email,
  v.preferred_username,
  v.user_type,
  v.role,
  d.department_id,
  v.sponsor_name,
  admin_user.user_id,
  v.token_hash,
  v.status,
  v.account_start_date::date,
  v.account_expiration_date::date,
  v.expires_at::timestamp,
  v.revoked_at::timestamp
FROM (VALUES
  ('Pending Employee Invite', 'pending.employee@nscict.local', 'pending.employee', 'employee', 'staff', 'Finance', NULL, '24aa730ee564faacbf1fbc1d270abf5e34db5c6440a07c74c55b53c1ca017f45', 'pending', CURRENT_DATE, NULL, NOW() + INTERVAL '7 days', NULL),
  ('Pending Contractor Invite', 'pending.contractor@example.com', 'pending.contractor', 'contractor', 'technician', 'ICT', 'Grace Eke', '53635038a24c3a190d85023719bab4392b3bec618ab71ae769986d341df49a3e', 'pending', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days', NOW() + INTERVAL '7 days', NULL),
  ('Revoked Invite', 'revoked.user@nscict.local', 'revoked.user', 'employee', 'staff', 'Operations', NULL, 'e0165e4103e8083b9d8720369693a3511b022c2e6ed4996b8631f3d38ace4772', 'revoked', CURRENT_DATE, NULL, NOW() + INTERVAL '2 days', NOW() - INTERVAL '1 day')
) AS v(full_name, email, preferred_username, user_type, role, department_name, sponsor_name, token_hash, status, account_start_date, account_expiration_date, expires_at, revoked_at)
JOIN departments d ON d.name = v.department_name
JOIN users admin_user ON admin_user.username = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM invitations existing WHERE existing.token_hash = v.token_hash
);

-- SLA policies ---------------------------------------------------------------
INSERT INTO sla_policies
  (name, ticket_type, priority, response_target_hours, resolution_target_hours,
   escalation_threshold_hours, notification_recipients, is_active)
SELECT *
FROM (VALUES
  ('Critical Incident SLA', 'Incident', 'Critical', 1, 4, 1, 'ICT Officer,Administrator', TRUE),
  ('High Incident SLA', 'Incident', 'High', 4, 8, 4, 'ICT Officer', TRUE),
  ('Service Request Standard SLA', 'Service Request', 'Medium', 8, 24, 8, 'ICT Officer', TRUE),
  ('Access Request SLA', 'Access Request', 'High', 2, 12, 4, 'ICT Officer,Administrator', TRUE),
  ('Maintenance Request SLA', 'Maintenance Request', 'Medium', 8, 48, 12, 'ICT Officer', TRUE),
  ('Change Request SLA', 'Change Request', 'Low', 24, 120, 24, 'ICT Officer', TRUE)
) AS v(name, ticket_type, priority, response_target_hours, resolution_target_hours, escalation_threshold_hours, notification_recipients, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM sla_policies existing WHERE LOWER(existing.name) = LOWER(v.name)
);

-- Assets ---------------------------------------------------------------------
INSERT INTO assets
  (asset_tag, asset_type, brand, model, serial_number, department_id,
   assigned_to, purchase_date, condition, status, location, description,
   is_archived)
SELECT
  v.asset_tag,
  v.asset_type,
  v.brand,
  v.model,
  v.serial_number,
  d.department_id,
  assigned_user.user_id,
  v.purchase_date::date,
  v.condition,
  v.status,
  v.location,
  v.description,
  FALSE
FROM (VALUES
  ('ICT-LAP-001', 'Laptop', 'Dell', 'Latitude 5420', 'SN-ICT-LAP-001', 'Finance', 'ngozi.umeh', '2024-01-15', 'Good', 'Assigned', 'Finance Office', 'Finance user laptop'),
  ('ICT-LAP-002', 'Laptop', 'Lenovo', 'ThinkPad E14', 'SN-ICT-LAP-002', 'Administration', 'daniel.intern', '2024-03-08', 'Fair', 'Under Maintenance', 'ICT Workshop', 'Laptop under repair'),
  ('ICT-PRN-001', 'Printer', 'HP', 'LaserJet Pro M404', 'SN-ICT-PRN-001', 'Finance', NULL, '2023-06-10', 'Good', 'Active', 'Finance Office', 'Shared finance printer'),
  ('ICT-NET-001', 'Router', 'Cisco', 'ISR 4331', 'SN-ICT-NET-001', 'ICT', NULL, '2022-11-20', 'Good', 'Active', 'Server Room', 'Core network router'),
  ('ICT-SWT-001', 'Switch', 'TP-Link', 'TL-SG1024', 'SN-ICT-SWT-001', 'ICT', NULL, '2022-11-22', 'Good', 'Active', 'Server Room', 'Distribution switch'),
  ('ICT-DSK-001', 'Desktop', 'HP', 'ProDesk 400', 'SN-ICT-DSK-001', 'Human Resources', 'blessing.nnamdi', '2023-02-14', 'Good', 'Assigned', 'HR Office', 'HR workstation'),
  ('ICT-MON-001', 'Monitor', 'Samsung', 'S24F350', 'SN-ICT-MON-001', 'Finance', 'ngozi.umeh', '2024-01-15', 'New', 'Assigned', 'Finance Office', 'External monitor'),
  ('ICT-UPS-001', 'UPS', 'APC', 'Back-UPS 1500VA', 'SN-ICT-UPS-001', 'ICT', NULL, '2021-08-09', 'Fair', 'Available', 'ICT Store', 'Spare UPS'),
  ('ICT-PRJ-001', 'Projector', 'Epson', 'EB-X41', 'SN-ICT-PRJ-001', 'Administration', NULL, '2020-05-05', 'Poor', 'Retired', 'ICT Store', 'Retired projector'),
  ('ICT-LAP-003', 'Laptop', 'HP', 'EliteBook 840', 'SN-ICT-LAP-003', 'Operations', 'tunde.bakare', '2023-09-12', 'Poor', 'Damaged', 'Operations Office', 'Damaged operations laptop')
) AS v(asset_tag, asset_type, brand, model, serial_number, department_name, assigned_username, purchase_date, condition, status, location, description)
JOIN departments d ON d.name = v.department_name
LEFT JOIN users assigned_user ON assigned_user.username = v.assigned_username
ON CONFLICT (asset_tag) DO UPDATE SET
  asset_type = EXCLUDED.asset_type,
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  serial_number = EXCLUDED.serial_number,
  department_id = EXCLUDED.department_id,
  assigned_to = EXCLUDED.assigned_to,
  purchase_date = EXCLUDED.purchase_date,
  condition = EXCLUDED.condition,
  status = EXCLUDED.status,
  location = EXCLUDED.location,
  description = EXCLUDED.description,
  is_archived = FALSE,
  archived_at = NULL,
  archive_reason = NULL;

-- Asset assignment and status history ---------------------------------------
INSERT INTO asset_assignments
  (asset_id, assigned_user_id, assigned_department_id, assigned_by_user_id,
   assigned_at, returned_at, assignment_notes, return_notes, is_active,
   expected_return_at, returned_condition, returned_to_user_id)
SELECT a.asset_id, assigned_user.user_id, d.department_id, admin_user.user_id,
       v.assigned_at::timestamp, v.returned_at::timestamp, v.assignment_notes,
       v.return_notes, v.is_active, v.expected_return_at::timestamp,
       v.returned_condition, receiver.user_id
FROM (VALUES
  ('ICT-LAP-001', 'ngozi.umeh', 'Finance', NOW() - INTERVAL '90 days', NULL, 'Issued to finance user', NULL, TRUE, NULL, NULL, NULL),
  ('ICT-MON-001', 'ngozi.umeh', 'Finance', NOW() - INTERVAL '80 days', NULL, 'Issued as external display', NULL, TRUE, NULL, NULL, NULL),
  ('ICT-LAP-003', 'tunde.bakare', 'Operations', NOW() - INTERVAL '140 days', NOW() - INTERVAL '7 days', 'Issued to operations staff', 'Returned with cracked screen', FALSE, NOW() - INTERVAL '10 days', 'Poor', 'ibrahim.musa')
) AS v(asset_tag, assigned_username, department_name, assigned_at, returned_at, assignment_notes, return_notes, is_active, expected_return_at, returned_condition, returned_to_username)
JOIN assets a ON a.asset_tag = v.asset_tag
LEFT JOIN users assigned_user ON assigned_user.username = v.assigned_username
LEFT JOIN departments d ON d.name = v.department_name
JOIN users admin_user ON admin_user.username = 'admin'
LEFT JOIN users receiver ON receiver.username = v.returned_to_username
WHERE NOT EXISTS (
  SELECT 1
  FROM asset_assignments existing
  WHERE existing.asset_id = a.asset_id
    AND COALESCE(existing.assigned_user_id, -1) = COALESCE(assigned_user.user_id, -1)
    AND existing.assigned_at::date = v.assigned_at::date
);

INSERT INTO asset_status_history
  (asset_id, actor_user_id, previous_status, next_status, reason,
   related_record_type, related_record_id, created_at)
SELECT a.asset_id, actor.user_id, v.previous_status, v.next_status, v.reason,
       v.related_record_type, NULL, v.created_at::timestamp
FROM (VALUES
  ('ICT-LAP-001', 'admin', 'Available', 'Assigned', 'Seeded assignment history', 'asset_assignment', NOW() - INTERVAL '90 days'),
  ('ICT-LAP-002', 'fatima.bello', 'Assigned', 'Under Maintenance', 'Seeded maintenance workflow', 'maintenance', NOW() - INTERVAL '4 days'),
  ('ICT-LAP-003', 'ibrahim.musa', 'Assigned', 'Damaged', 'Returned with cracked screen', 'asset_assignment', NOW() - INTERVAL '7 days')
) AS v(asset_tag, actor_username, previous_status, next_status, reason, related_record_type, created_at)
JOIN assets a ON a.asset_tag = v.asset_tag
LEFT JOIN users actor ON actor.username = v.actor_username
WHERE NOT EXISTS (
  SELECT 1 FROM asset_status_history existing
  WHERE existing.asset_id = a.asset_id
    AND existing.next_status = v.next_status
    AND existing.reason = v.reason
);

-- Service requests -----------------------------------------------------------
INSERT INTO service_requests
  (ticket_number, requester_id, department_id, category, subcategory, subject,
   description, priority, ticket_type, status, assigned_technician_id,
   assigned_ict_officer_id, assigned_by_user_id, assigned_at, accepted_at,
   first_response_at, assignment_notes, expected_completion_at, affected_asset_id,
   sla_policy_id, sla_response_due_at, sla_resolution_due_at,
   response_escalated_at, resolution_escalated_at, last_escalated_at,
   escalation_count, impact, urgency, source_channel, resolution,
   resolution_summary, date_submitted, date_resolved, closed_at,
   closed_by_user_id, closure_confirmation_required, closure_confirmed_at,
   reopen_reason, cancel_reason, reopened_count, status_changed_at, is_archived)
SELECT
  v.ticket_number,
  requester.user_id,
  d.department_id,
  v.category,
  v.subcategory,
  v.subject,
  v.description,
  v.priority,
  v.ticket_type,
  v.status,
  tech.user_id,
  officer.user_id,
  assigner.user_id,
  v.assigned_at::timestamp,
  v.accepted_at::timestamp,
  v.first_response_at::timestamp,
  v.assignment_notes,
  v.expected_completion_at::timestamp,
  asset.asset_id,
  sla.sla_policy_id,
  v.sla_response_due_at::timestamp,
  v.sla_resolution_due_at::timestamp,
  v.response_escalated_at::timestamp,
  v.resolution_escalated_at::timestamp,
  v.last_escalated_at::timestamp,
  v.escalation_count,
  v.impact,
  v.urgency,
  v.source_channel,
  v.resolution,
  LEFT(v.resolution, 255),
  v.date_submitted::timestamp,
  v.date_resolved::timestamp,
  v.closed_at::timestamp,
  closer.user_id,
  v.closure_confirmation_required,
  v.closure_confirmed_at::timestamp,
  v.reopen_reason,
  v.cancel_reason,
  v.reopened_count,
  v.status_changed_at::timestamp,
  FALSE
FROM (VALUES
  ('NSC-2026-00001', 'ngozi.umeh', 'Finance', 'Printer', 'paper jam', 'Finance printer is not printing', 'Printer accepts jobs but produces blank pages.', 'High', 'Incident', 'New', NULL, 'ibrahim.musa', NULL, NULL, NULL, NULL, NULL, NULL, 'ICT-PRN-001', 'High Incident SLA', NOW() - INTERVAL '6 hours', NOW() + INTERVAL '6 hours', NOW() - INTERVAL '3 hours', NULL, NOW() - INTERVAL '3 hours', 1, 'High', 'High', 'portal', NULL, NOW() - INTERVAL '1 day', NULL, NULL, NULL, FALSE, NULL, NULL, NULL, 0, NOW() - INTERVAL '1 day'),
  ('NSC-2026-00002', 'ngozi.umeh', 'Finance', 'Network', 'wifi', 'Intermittent connection in Finance office', 'Network connection drops several times each morning.', 'Medium', 'Service Request', 'Assigned', 'chinedu.obi', 'ibrahim.musa', 'ibrahim.musa', NOW() - INTERVAL '20 hours', NULL, NULL, 'Check access switch and Wi-Fi AP.', NOW() + INTERVAL '12 hours', 'ICT-NET-001', 'Service Request Standard SLA', NOW() - INTERVAL '12 hours', NOW() + INTERVAL '4 hours', NULL, NULL, NULL, 0, 'Medium', 'Medium', 'portal', NULL, NOW() - INTERVAL '22 hours', NULL, NULL, NULL, FALSE, NULL, NULL, NULL, 0, NOW() - INTERVAL '20 hours'),
  ('NSC-2026-00003', 'daniel.intern', 'Administration', 'Hardware', 'blue screen', 'Laptop displays a blue screen', 'The assigned laptop restarts with a blue-screen error.', 'High', 'Incident', 'In Progress', 'fatima.bello', 'grace.eke', 'grace.eke', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 21 hours', NOW() - INTERVAL '2 days 21 hours', 'Diagnose driver and disk health.', NOW() - INTERVAL '1 day', 'ICT-LAP-002', 'High Incident SLA', NOW() - INTERVAL '2 days 20 hours', NOW() - INTERVAL '2 days 10 hours', NOW() - INTERVAL '2 days 18 hours', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', 2, 'High', 'High', 'walk-in', NULL, NOW() - INTERVAL '3 days', NULL, NULL, NULL, FALSE, NULL, NULL, NULL, 0, NOW() - INTERVAL '2 days 21 hours'),
  ('NSC-2026-00004', 'tunde.bakare', 'Operations', 'Network', 'vpn', 'VPN access required for field reports', 'Requesting VPN access for offsite field reporting.', 'High', 'Access Request', 'Accepted', 'segun.adewale', 'ibrahim.musa', 'ibrahim.musa', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '9 hours', NOW() - INTERVAL '9 hours', 'Validate manager approval before provisioning.', NOW() + INTERVAL '5 hours', NULL, 'Access Request SLA', NOW() - INTERVAL '8 hours', NOW() + INTERVAL '2 hours', NULL, NULL, NULL, 0, 'High', 'High', 'portal', NULL, NOW() - INTERVAL '12 hours', NULL, NULL, NULL, FALSE, NULL, NULL, NULL, 0, NOW() - INTERVAL '9 hours'),
  ('NSC-2026-00005', 'blessing.nnamdi', 'Human Resources', 'Software', 'installation', 'Install approved HR payroll client', 'Approved HR payroll client needs installation and testing.', 'Low', 'Change Request', 'Resolved', 'segun.adewale', 'grace.eke', 'grace.eke', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days 22 hours', NOW() - INTERVAL '7 days 22 hours', 'Install after business hours.', NOW() - INTERVAL '6 days', NULL, 'Change Request SLA', NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NULL, NULL, NULL, 0, 'Low', 'Low', 'portal', 'Installed approved client, tested login, and confirmed with requester.', NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days', NULL, NULL, TRUE, NULL, NULL, NULL, 0, NOW() - INTERVAL '6 days'),
  ('NSC-2026-00006', 'ngozi.umeh', 'Finance', 'Email', 'mailbox', 'Mailbox locked after password attempts', 'Repeated password attempts locked the mailbox.', 'Medium', 'Incident', 'Closed', 'chinedu.obi', 'ibrahim.musa', 'ibrahim.musa', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days 20 hours', NOW() - INTERVAL '13 days 20 hours', 'Reset mailbox access.', NOW() - INTERVAL '13 days', NULL, 'Default Medium SLA', NOW() - INTERVAL '13 days 16 hours', NOW() - INTERVAL '13 days 8 hours', NULL, NULL, NULL, 0, 'Medium', 'Medium', 'phone', 'Mailbox unlocked and password reset completed.', NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days', 'ngozi.umeh', FALSE, NOW() - INTERVAL '12 days', NULL, NULL, 0, NOW() - INTERVAL '12 days'),
  ('NSC-2026-00007', 'emeka.nwosu', 'Marine Engineering', 'Hardware', 'monitor', 'Replacement monitor needed', 'Primary monitor flickers during engineering review sessions.', 'Low', 'Maintenance Request', 'Reopened', 'aisha.contractor', 'grace.eke', 'grace.eke', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', 'Inspect display cable before replacement.', NOW() + INTERVAL '1 day', NULL, 'Maintenance Request SLA', NOW() - INTERVAL '3 days 16 hours', NOW() - INTERVAL '2 days', NULL, NULL, NULL, 0, 'Low', 'Medium', 'portal', 'Cable reseated, issue temporarily cleared.', NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days', NULL, NULL, FALSE, NULL, 'Issue returned after initial fix.', NULL, 1, NOW() - INTERVAL '1 day'),
  ('NSC-2026-00008', 'tunde.bakare', 'Operations', 'Other', 'duplicate', 'Duplicate software request cancelled', 'Duplicate request opened in error.', 'Low', 'Service Request', 'Cancelled', NULL, 'ibrahim.musa', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Service Request Standard SLA', NOW() + INTERVAL '8 hours', NOW() + INTERVAL '24 hours', NULL, NULL, NULL, 0, 'Low', 'Low', 'portal', NULL, NOW() - INTERVAL '6 hours', NULL, NULL, NULL, FALSE, NULL, NULL, 'Duplicate request.', 0, NOW() - INTERVAL '5 hours')
) AS v(ticket_number, requester_username, department_name, category, subcategory, subject, description, priority, ticket_type, status, technician_username, officer_username, assigner_username, assigned_at, accepted_at, first_response_at, assignment_notes, expected_completion_at, asset_tag, sla_name, sla_response_due_at, sla_resolution_due_at, response_escalated_at, resolution_escalated_at, last_escalated_at, escalation_count, impact, urgency, source_channel, resolution, date_submitted, date_resolved, closed_at, closed_by_username, closure_confirmation_required, closure_confirmed_at, reopen_reason, cancel_reason, reopened_count, status_changed_at)
JOIN users requester ON requester.username = v.requester_username
JOIN departments d ON d.name = v.department_name
LEFT JOIN users tech ON tech.username = v.technician_username
LEFT JOIN users officer ON officer.username = v.officer_username
LEFT JOIN users assigner ON assigner.username = v.assigner_username
LEFT JOIN users closer ON closer.username = v.closed_by_username
LEFT JOIN assets asset ON asset.asset_tag = v.asset_tag
LEFT JOIN sla_policies sla ON LOWER(sla.name) = LOWER(v.sla_name)
WHERE NOT EXISTS (
  SELECT 1 FROM service_requests existing
  WHERE LOWER(existing.ticket_number) = LOWER(v.ticket_number)
);

-- Ticket assignments, comments, history, and attachments ---------------------
INSERT INTO ticket_assignments
  (request_id, assigned_technician_id, assigned_ict_officer_id, assigned_by_user_id,
   assignment_notes, assigned_at, accepted_at, expected_completion_at, ended_at,
   end_reason, is_active)
SELECT sr.request_id, tech.user_id, officer.user_id, assigner.user_id,
       v.assignment_notes, v.assigned_at::timestamp, v.accepted_at::timestamp,
       v.expected_completion_at::timestamp, v.ended_at::timestamp, v.end_reason,
       v.is_active
FROM (VALUES
  ('NSC-2026-00002', 'chinedu.obi', 'ibrahim.musa', 'ibrahim.musa', 'Initial assignment to network technician', NOW() - INTERVAL '20 hours', NULL, NOW() + INTERVAL '12 hours', NULL, NULL, TRUE),
  ('NSC-2026-00003', 'chinedu.obi', 'grace.eke', 'grace.eke', 'Initial hardware assignment', NOW() - INTERVAL '3 days', NULL, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days 22 hours', 'Reassigned to endpoint specialist', FALSE),
  ('NSC-2026-00003', 'fatima.bello', 'grace.eke', 'grace.eke', 'Reassigned after initial triage', NOW() - INTERVAL '2 days 22 hours', NOW() - INTERVAL '2 days 21 hours', NOW() - INTERVAL '1 day', NULL, NULL, TRUE),
  ('NSC-2026-00004', 'segun.adewale', 'ibrahim.musa', 'ibrahim.musa', 'Access provisioning assigned', NOW() - INTERVAL '10 hours', NOW() - INTERVAL '9 hours', NOW() + INTERVAL '5 hours', NULL, NULL, TRUE),
  ('NSC-2026-00007', 'aisha.contractor', 'grace.eke', 'grace.eke', 'Contractor assigned to inspect display issue', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '1 day', NULL, NULL, TRUE)
) AS v(ticket_number, technician_username, officer_username, assigner_username, assignment_notes, assigned_at, accepted_at, expected_completion_at, ended_at, end_reason, is_active)
JOIN service_requests sr ON LOWER(sr.ticket_number) = LOWER(v.ticket_number)
LEFT JOIN users tech ON tech.username = v.technician_username
LEFT JOIN users officer ON officer.username = v.officer_username
LEFT JOIN users assigner ON assigner.username = v.assigner_username
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_assignments existing
  WHERE existing.request_id = sr.request_id
    AND COALESCE(existing.assigned_technician_id, -1) = COALESCE(tech.user_id, -1)
    AND existing.assigned_at::date = v.assigned_at::date
    AND existing.assignment_notes = v.assignment_notes
);

INSERT INTO ticket_comments (request_id, author_user_id, comment_body, is_internal, created_at)
SELECT sr.request_id, author.user_id, v.comment_body, v.is_internal, v.created_at::timestamp
FROM (VALUES
  ('NSC-2026-00002', 'ngozi.umeh', 'The outage is worst between 9am and 11am.', FALSE, NOW() - INTERVAL '18 hours'),
  ('NSC-2026-00002', 'chinedu.obi', 'I will test the access point and switch port today.', FALSE, NOW() - INTERVAL '17 hours'),
  ('NSC-2026-00003', 'fatima.bello', 'Internal note: disk health report shows high failure count.', TRUE, NOW() - INTERVAL '2 days 20 hours'),
  ('NSC-2026-00007', 'emeka.nwosu', 'The flicker returned during a presentation.', FALSE, NOW() - INTERVAL '1 day')
) AS v(ticket_number, author_username, comment_body, is_internal, created_at)
JOIN service_requests sr ON LOWER(sr.ticket_number) = LOWER(v.ticket_number)
JOIN users author ON author.username = v.author_username
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_comments existing
  WHERE existing.request_id = sr.request_id
    AND existing.comment_body = v.comment_body
);

INSERT INTO ticket_history
  (request_id, actor_user_id, event_type, from_status, to_status, details, created_at)
SELECT sr.request_id, actor.user_id, v.event_type, v.from_status, v.to_status,
       v.details, v.created_at::timestamp
FROM (VALUES
  ('NSC-2026-00001', 'ngozi.umeh', 'created', NULL, 'New', 'Ticket created from portal', NOW() - INTERVAL '1 day'),
  ('NSC-2026-00002', 'ibrahim.musa', 'assigned', 'New', 'Assigned', 'Assigned to Chinedu Obi', NOW() - INTERVAL '20 hours'),
  ('NSC-2026-00003', 'grace.eke', 'reassigned', 'Assigned', 'Assigned', 'Reassigned to Fatima Bello', NOW() - INTERVAL '2 days 22 hours'),
  ('NSC-2026-00003', 'fatima.bello', 'accepted', 'Assigned', 'Accepted', 'Technician accepted the ticket', NOW() - INTERVAL '2 days 21 hours'),
  ('NSC-2026-00003', 'fatima.bello', 'status_changed', 'Accepted', 'In Progress', 'Diagnostics started', NOW() - INTERVAL '2 days 20 hours'),
  ('NSC-2026-00003', 'ibrahim.musa', 'escalated', 'In Progress', 'In Progress', 'Resolution SLA breached', NOW() - INTERVAL '1 day'),
  ('NSC-2026-00005', 'segun.adewale', 'resolved', 'In Progress', 'Resolved', 'Software installed and tested', NOW() - INTERVAL '6 days'),
  ('NSC-2026-00006', 'ngozi.umeh', 'closed', 'Resolved', 'Closed', 'Requester confirmed closure', NOW() - INTERVAL '12 days'),
  ('NSC-2026-00007', 'emeka.nwosu', 'reopened', 'Resolved', 'Reopened', 'Issue returned after initial fix', NOW() - INTERVAL '1 day'),
  ('NSC-2026-00008', 'ibrahim.musa', 'status_changed', 'New', 'Cancelled', 'Duplicate request cancelled', NOW() - INTERVAL '5 hours')
) AS v(ticket_number, actor_username, event_type, from_status, to_status, details, created_at)
JOIN service_requests sr ON LOWER(sr.ticket_number) = LOWER(v.ticket_number)
LEFT JOIN users actor ON actor.username = v.actor_username
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_history existing
  WHERE existing.request_id = sr.request_id
    AND existing.event_type = v.event_type
    AND existing.details = v.details
);

INSERT INTO ticket_attachments
  (request_id, uploaded_by_user_id, file_name, storage_key, mime_type,
   file_size_bytes, is_internal, created_at)
SELECT sr.request_id, uploader.user_id, v.file_name, v.storage_key,
       v.mime_type, v.file_size_bytes, v.is_internal, v.created_at::timestamp
FROM (VALUES
  ('NSC-2026-00002', 'ngozi.umeh', 'finance-network-drop.txt', 'seed/NSC-2026-00002/finance-network-drop.txt', 'text/plain', 128, FALSE, NOW() - INTERVAL '18 hours'),
  ('NSC-2026-00003', 'fatima.bello', 'disk-health-internal.txt', 'seed/NSC-2026-00003/disk-health-internal.txt', 'text/plain', 256, TRUE, NOW() - INTERVAL '2 days 20 hours')
) AS v(ticket_number, uploader_username, file_name, storage_key, mime_type, file_size_bytes, is_internal, created_at)
JOIN service_requests sr ON LOWER(sr.ticket_number) = LOWER(v.ticket_number)
JOIN users uploader ON uploader.username = v.uploader_username
WHERE NOT EXISTS (
  SELECT 1 FROM ticket_attachments existing WHERE existing.storage_key = v.storage_key
);

-- Maintenance and schedules --------------------------------------------------
INSERT INTO maintenance_schedules
  (asset_id, title, description, maintenance_type, frequency_unit,
   frequency_value, next_due_at, last_completed_at, assigned_technician_id,
   assigned_by_user_id, reminder_days_before, checklist_json, is_active)
SELECT a.asset_id, v.title, v.description, v.maintenance_type, v.frequency_unit,
       v.frequency_value, v.next_due_at::timestamp, v.last_completed_at::timestamp,
       tech.user_id, admin_user.user_id, v.reminder_days_before,
       v.checklist_json::jsonb, TRUE
FROM (VALUES
  ('ICT-NET-001', 'Monthly router health inspection', 'Check firmware, uptime, config backup, and port errors.', 'Inspection', 'months', 1, NOW() + INTERVAL '5 days', NOW() - INTERVAL '25 days', 'segun.adewale', 3, '["Review logs","Backup config","Inspect ports"]'),
  ('ICT-PRN-001', 'Finance printer preventive service', 'Clean printer path and inspect toner/drum condition.', 'Preventive', 'weeks', 2, NOW() - INTERVAL '2 days', NOW() - INTERVAL '16 days', 'chinedu.obi', 3, '["Clean rollers","Check toner","Run test page"]'),
  ('ICT-LAP-002', 'Temporary laptop repair follow-up', 'Confirm SSD replacement and OS stability.', 'Inspection', 'days', 7, NOW() + INTERVAL '1 day', NULL, 'fatima.bello', 1, '["Run disk test","Check event logs","Confirm boot cycle"]')
) AS v(asset_tag, title, description, maintenance_type, frequency_unit, frequency_value, next_due_at, last_completed_at, technician_username, reminder_days_before, checklist_json)
JOIN assets a ON a.asset_tag = v.asset_tag
JOIN users tech ON tech.username = v.technician_username
JOIN users admin_user ON admin_user.username = 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance_schedules existing
  WHERE existing.asset_id = a.asset_id
    AND LOWER(existing.title) = LOWER(v.title)
);

INSERT INTO maintenance
  (asset_id, technician_id, problem, action_taken, maintenance_date, cost,
   status, notes, maintenance_type, assigned_by_user_id, schedule_id,
   scheduled_start_at, started_at, completed_at, next_due_at, checklist_json,
   completion_notes)
SELECT a.asset_id, tech.user_id, v.problem, v.action_taken, v.maintenance_date::date,
       v.cost::numeric, v.status, v.notes, v.maintenance_type, admin_user.user_id,
       schedule.schedule_id, v.scheduled_start_at::timestamp, v.started_at::timestamp,
       v.completed_at::timestamp, v.next_due_at::timestamp, v.checklist_json::jsonb,
       v.completion_notes
FROM (VALUES
  ('ICT-LAP-002', 'fatima.bello', 'Laptop blue-screen failure', 'Diagnostic testing and driver inspection started.', CURRENT_DATE - INTERVAL '4 days', 15000, 'In Progress', 'Awaiting replacement SSD confirmation.', 'Corrective', 'Temporary laptop repair follow-up', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NULL, NOW() + INTERVAL '1 day', '["Disk test started","Driver rollback pending"]', NULL),
  ('ICT-PRN-001', 'chinedu.obi', 'Blank pages from printer', 'Printer cartridge and drum inspected.', CURRENT_DATE - INTERVAL '2 days', 8500, 'Scheduled', 'Follow-up visit scheduled.', 'Preventive', 'Finance printer preventive service', NOW() + INTERVAL '1 day', NULL, NULL, NOW() - INTERVAL '2 days', '["Clean rollers","Check toner"]', NULL),
  ('ICT-NET-001', 'segun.adewale', 'Preventive router inspection', 'Firmware and configuration checked.', CURRENT_DATE - INTERVAL '15 days', 0, 'Completed', 'No issue found.', 'Inspection', 'Monthly router health inspection', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days 2 hours', NOW() + INTERVAL '5 days', '["Review logs","Backup config","Inspect ports"]', 'Router inspection completed successfully.')
) AS v(asset_tag, technician_username, problem, action_taken, maintenance_date, cost, status, notes, maintenance_type, schedule_title, scheduled_start_at, started_at, completed_at, next_due_at, checklist_json, completion_notes)
JOIN assets a ON a.asset_tag = v.asset_tag
JOIN users tech ON tech.username = v.technician_username
JOIN users admin_user ON admin_user.username = 'admin'
LEFT JOIN maintenance_schedules schedule ON schedule.asset_id = a.asset_id AND LOWER(schedule.title) = LOWER(v.schedule_title)
WHERE NOT EXISTS (
  SELECT 1 FROM maintenance existing
  WHERE existing.asset_id = a.asset_id
    AND existing.problem = v.problem
);

-- Notifications and delivery queue ------------------------------------------
INSERT INTO notifications
  (recipient_user_id, notification_type, title, message, related_record_type,
   related_record_id, payload_json, is_read, read_at, severity, action_url,
   created_at)
SELECT recipient.user_id, v.notification_type, v.title, v.message,
       v.related_record_type, sr.request_id, v.payload_json::jsonb,
       v.is_read, CASE WHEN v.is_read THEN NOW() - INTERVAL '2 hours' ELSE NULL END,
       v.severity, v.action_url, v.created_at::timestamp
FROM (VALUES
  ('chinedu.obi', 'ticket_assigned', 'Ticket assigned', 'Finance network ticket has been assigned to you.', 'service_request', 'NSC-2026-00002', '{"ticket_number":"NSC-2026-00002"}', FALSE, 'info', '/service-requests.html#ticket-NSC-2026-00002', NOW() - INTERVAL '20 hours'),
  ('fatima.bello', 'ticket_escalated', 'Ticket escalated', 'Laptop blue-screen ticket has breached resolution SLA.', 'service_request', 'NSC-2026-00003', '{"ticket_number":"NSC-2026-00003"}', FALSE, 'warning', '/service-requests.html#ticket-NSC-2026-00003', NOW() - INTERVAL '1 day'),
  ('ngozi.umeh', 'ticket_comment', 'New ticket comment', 'A technician commented on your network ticket.', 'service_request', 'NSC-2026-00002', '{"ticket_number":"NSC-2026-00002"}', TRUE, 'info', '/service-requests.html#ticket-NSC-2026-00002', NOW() - INTERVAL '17 hours'),
  ('segun.adewale', 'maintenance_due', 'Maintenance due', 'Router inspection is due soon.', 'service_request', NULL, '{}', FALSE, 'warning', '/maintenance.html', NOW() - INTERVAL '6 hours')
) AS v(recipient_username, notification_type, title, message, related_record_type, ticket_number, payload_json, is_read, severity, action_url, created_at)
JOIN users recipient ON recipient.username = v.recipient_username
LEFT JOIN service_requests sr ON LOWER(sr.ticket_number) = LOWER(v.ticket_number)
WHERE NOT EXISTS (
  SELECT 1 FROM notifications existing
  WHERE existing.recipient_user_id = recipient.user_id
    AND existing.notification_type = v.notification_type
    AND existing.title = v.title
    AND existing.created_at::date = v.created_at::date
);

INSERT INTO notification_deliveries
  (notification_id, recipient_user_id, channel, delivery_status,
   recipient_address, subject, body_text, provider_name, attempt_count,
   max_attempts, queued_at, next_attempt_at, last_attempt_at, last_error)
SELECT n.notification_id, n.recipient_user_id, 'email', v.delivery_status,
       recipient.email, n.title, n.message, 'seed-smtp', v.attempt_count,
       5, NOW() - INTERVAL '1 hour', NOW() + INTERVAL '30 minutes',
       CASE WHEN v.attempt_count > 0 THEN NOW() - INTERVAL '30 minutes' ELSE NULL END,
       v.last_error
FROM (VALUES
  ('fatima.bello', 'Ticket escalated', 'deferred', 1, 'SMTP is not configured in local seed data'),
  ('chinedu.obi', 'Ticket assigned', 'pending', 0, NULL)
) AS v(recipient_username, notification_title, delivery_status, attempt_count, last_error)
JOIN users recipient ON recipient.username = v.recipient_username
JOIN notifications n ON n.recipient_user_id = recipient.user_id AND n.title = v.notification_title
WHERE NOT EXISTS (
  SELECT 1 FROM notification_deliveries existing
  WHERE existing.notification_id = n.notification_id
    AND existing.channel = 'email'
);

-- Knowledge base -------------------------------------------------------------
INSERT INTO knowledge_base_articles
  (title, slug, summary, body, status, category, visibility_scope,
   department_id, search_keywords, created_by_user_id, updated_by_user_id,
   published_at, last_reviewed_at, current_revision_number, view_count,
   helpful_count, not_helpful_count, usefulness_score)
SELECT v.title, v.slug, v.summary, v.body, v.status, v.category,
       v.visibility_scope, d.department_id, v.search_keywords, creator.user_id,
       creator.user_id, CASE WHEN v.status = 'published' THEN NOW() - INTERVAL '5 days' ELSE NULL END,
       NOW() - INTERVAL '2 days', 1, v.view_count, v.helpful_count,
       v.not_helpful_count, v.helpful_count - v.not_helpful_count
FROM (VALUES
  ('Resolve printer blank pages', 'resolve-printer-blank-pages', 'Steps for checking toner, drum, and print settings when printers output blank pages.', '1. Confirm the toner seal is removed.\n2. Print a test page.\n3. Inspect drum and cartridge seating.\n4. Escalate to ICT if output remains blank.', 'published', 'Printer', 'all_users', NULL, 'printer blank pages toner drum cartridge', 18, 5, 1),
  ('Troubleshoot intermittent Wi-Fi', 'troubleshoot-intermittent-wifi', 'Checklist for diagnosing repeated wireless or network drops in an office area.', 'Check signal strength, switch port errors, access point uptime, DHCP leases, and recent power events.', 'published', 'Network', 'operational_only', NULL, 'wifi wireless network drops access point switch', 24, 6, 0),
  ('VPN access request checklist', 'vpn-access-request-checklist', 'Required checks before VPN access is provisioned.', 'Confirm requester identity, supervisor approval, device compliance, MFA enrollment, and approved business need.', 'published', 'Access Request', 'department', 'Operations', 'vpn access remote field reporting mfa', 12, 4, 1),
  ('Draft laptop replacement guide', 'draft-laptop-replacement-guide', 'Draft internal guide for laptop replacement approval.', 'Collect fault report, verify asset history, check stock, and obtain approval before replacement.', 'draft', 'Hardware', 'operational_only', NULL, 'laptop replacement approval stock', 2, 0, 0)
) AS v(title, slug, summary, body, status, category, visibility_scope, department_name, search_keywords, view_count, helpful_count, not_helpful_count)
LEFT JOIN departments d ON d.name = v.department_name
JOIN users creator ON creator.username = 'ibrahim.musa'
ON CONFLICT (LOWER(slug)) DO UPDATE SET
  title = EXCLUDED.title,
  summary = EXCLUDED.summary,
  body = EXCLUDED.body,
  status = EXCLUDED.status,
  category = EXCLUDED.category,
  visibility_scope = EXCLUDED.visibility_scope,
  department_id = EXCLUDED.department_id,
  search_keywords = EXCLUDED.search_keywords,
  updated_by_user_id = EXCLUDED.updated_by_user_id,
  view_count = EXCLUDED.view_count,
  helpful_count = EXCLUDED.helpful_count,
  not_helpful_count = EXCLUDED.not_helpful_count,
  usefulness_score = EXCLUDED.usefulness_score;

INSERT INTO knowledge_base_article_revisions
  (article_id, revision_number, title, summary, body, category,
   visibility_scope, department_id, search_keywords, change_note,
   changed_by_user_id, created_at)
SELECT article.article_id, 1, article.title, article.summary, article.body,
       article.category, article.visibility_scope, article.department_id,
       article.search_keywords, 'Seeded initial article revision',
       editor.user_id, NOW() - INTERVAL '5 days'
FROM knowledge_base_articles article
JOIN users editor ON editor.username = 'ibrahim.musa'
WHERE article.slug IN (
  'resolve-printer-blank-pages',
  'troubleshoot-intermittent-wifi',
  'vpn-access-request-checklist',
  'draft-laptop-replacement-guide'
)
ON CONFLICT (article_id, revision_number) DO NOTHING;

INSERT INTO knowledge_base_article_relations
  (article_id, relation_type, asset_id, asset_type, ticket_category,
   ticket_subcategory)
SELECT article.article_id, v.relation_type, asset.asset_id, v.asset_type,
       v.ticket_category, v.ticket_subcategory
FROM (VALUES
  ('resolve-printer-blank-pages', 'asset_type', NULL, 'Printer', NULL, NULL),
  ('resolve-printer-blank-pages', 'ticket_category', NULL, NULL, 'Printer', 'paper jam'),
  ('troubleshoot-intermittent-wifi', 'asset_type', NULL, 'Router', NULL, NULL),
  ('troubleshoot-intermittent-wifi', 'ticket_category', NULL, NULL, 'Network', 'wifi'),
  ('vpn-access-request-checklist', 'ticket_category', NULL, NULL, 'Access Request', 'vpn'),
  ('draft-laptop-replacement-guide', 'asset', 'ICT-LAP-002', NULL, NULL, NULL),
  ('draft-laptop-replacement-guide', 'ticket_category', NULL, NULL, 'Hardware', 'blue screen')
) AS v(slug, relation_type, asset_tag, asset_type, ticket_category, ticket_subcategory)
JOIN knowledge_base_articles article ON article.slug = v.slug
LEFT JOIN assets asset ON asset.asset_tag = v.asset_tag
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_base_article_relations existing
  WHERE existing.article_id = article.article_id
    AND existing.relation_type = v.relation_type
    AND COALESCE(existing.asset_id, -1) = COALESCE(asset.asset_id, -1)
    AND COALESCE(existing.asset_type, '') = COALESCE(v.asset_type, '')
    AND COALESCE(existing.ticket_category, '') = COALESCE(v.ticket_category, '')
    AND COALESCE(existing.ticket_subcategory, '') = COALESCE(v.ticket_subcategory, '')
);

INSERT INTO knowledge_base_article_feedback
  (article_id, user_id, request_id, is_helpful, feedback_note, created_at)
SELECT article.article_id, feedback_user.user_id, sr.request_id,
       v.is_helpful, v.feedback_note, NOW() - INTERVAL '1 day'
FROM (VALUES
  ('resolve-printer-blank-pages', 'ngozi.umeh', 'NSC-2026-00001', TRUE, 'Matched my printer issue.'),
  ('troubleshoot-intermittent-wifi', 'chinedu.obi', 'NSC-2026-00002', TRUE, 'Useful network checklist.'),
  ('vpn-access-request-checklist', 'tunde.bakare', 'NSC-2026-00004', FALSE, 'Needs clearer approval steps.')
) AS v(slug, username, ticket_number, is_helpful, feedback_note)
JOIN knowledge_base_articles article ON article.slug = v.slug
JOIN users feedback_user ON feedback_user.username = v.username
LEFT JOIN service_requests sr ON LOWER(sr.ticket_number) = LOWER(v.ticket_number)
WHERE NOT EXISTS (
  SELECT 1 FROM knowledge_base_article_feedback existing
  WHERE existing.article_id = article.article_id
    AND existing.user_id = feedback_user.user_id
    AND COALESCE(existing.request_id, -1) = COALESCE(sr.request_id, -1)
);

-- Audit logs -----------------------------------------------------------------
INSERT INTO audit_logs
  (user_id, action, record_type, record_id, details, created_at)
SELECT actor.user_id, v.action, v.record_type, sr.request_id, v.details,
       v.created_at::timestamp
FROM (VALUES
  ('admin', 'Seed data loaded', 'system', NULL, 'Development seed data initialized.', NOW()),
  ('ibrahim.musa', 'Technician assigned', 'service_request', 'NSC-2026-00002', 'Assigned network ticket to Chinedu Obi.', NOW() - INTERVAL '20 hours'),
  ('fatima.bello', 'Request status changed', 'service_request', 'NSC-2026-00003', 'Moved laptop blue-screen ticket to In Progress.', NOW() - INTERVAL '2 days 20 hours'),
  ('ibrahim.musa', 'Knowledge article created', 'knowledge_base_article', NULL, 'Created seeded support article.', NOW() - INTERVAL '5 days')
) AS v(actor_username, action, record_type, ticket_number, details, created_at)
JOIN users actor ON actor.username = v.actor_username
LEFT JOIN service_requests sr ON LOWER(sr.ticket_number) = LOWER(v.ticket_number)
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs existing
  WHERE existing.user_id = actor.user_id
    AND existing.action = v.action
    AND existing.details = v.details
);

COMMIT;

-- Quick verification ---------------------------------------------------------
SELECT username, role, user_type, is_active, account_start_date, account_expiration_date
FROM users
WHERE username IN (
  'admin', 'ibrahim.musa', 'grace.eke', 'chinedu.obi', 'fatima.bello',
  'segun.adewale', 'ngozi.umeh', 'daniel.intern', 'aisha.contractor',
  'peter.ojo', 'future.corper'
)
ORDER BY username;
