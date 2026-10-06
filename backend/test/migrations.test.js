const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(
  __dirname,
  '..',
  '..',
  'database',
  'migrations',
  '002_phase_4_database_foundation.sql'
);

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
const phase5MigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '003_phase_5_ticket_workflow.sql'
  ),
  'utf8'
);
const phase6MigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '004_phase_6_assignment_sla_management.sql'
  ),
  'utf8'
);
const phase7MigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '005_phase_7_notification_service.sql'
  ),
  'utf8'
);
const phase8MigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '006_phase_8_asset_maintenance_management.sql'
  ),
  'utf8'
);
const phase9MigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '007_phase_9_knowledge_base.sql'
  ),
  'utf8'
);
const bootstrapMigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '000_bootstrap_foundation.sql'
  ),
  'utf8'
);
const authHardeningMigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '008_auth_session_hardening.sql'
  ),
  'utf8'
);
const operationalJobsMigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '009_operational_job_runs.sql'
  ),
  'utf8'
);
const phase6AuthHardeningMigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '010_phase_6_authentication_hardening.sql'
  ),
  'utf8'
);
const phase10DomainIntegrityMigrationSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'migrations',
    '011_phase_10_domain_integrity.sql'
  ),
  'utf8'
);
const phase10DomainIntegrityRollbackSql = fs.readFileSync(
  path.join(
    __dirname,
    '..',
    '..',
    'database',
    'rollbacks',
    '011_phase_10_domain_integrity.rollback.sql'
  ),
  'utf8'
);
const slaWarningMigrationSql = fs.readFileSync(
  path.join(__dirname, '..', '..', 'database', 'migrations', '015_sla_warning_notifications.sql'),
  'utf8'
);

test('bootstrap migration creates the original foundation tables non-destructively', () => {
  for (const tableName of ['departments', 'users', 'assets', 'service_requests', 'maintenance', 'audit_logs']) {
    assert.match(
      bootstrapMigrationSql,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\b`, 'i'),
      `missing non-destructive bootstrap table for ${tableName}`
    );
  }

  assert.doesNotMatch(bootstrapMigrationSql, /DROP TABLE|TRUNCATE/i);
  assert.match(bootstrapMigrationSql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_ci/i);
  assert.match(bootstrapMigrationSql, /CREATE OR REPLACE FUNCTION set_updated_at/i);
});

test('phase 4 migration creates the new operational tables', () => {
  const expectedTables = [
    'sla_policies',
    'ticket_comments',
    'ticket_history',
    'ticket_attachments',
    'asset_assignments',
    'notifications',
    'notification_preferences',
    'knowledge_base_articles',
  ];

  for (const tableName of expectedTables) {
    assert.match(
      migrationSql,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\b`, 'i'),
      `missing CREATE TABLE for ${tableName}`
    );
  }
});

test('phase 4 migration adds integrity constraints and archive support', () => {
  assert.match(migrationSql, /ADD COLUMN IF NOT EXISTS ticket_number VARCHAR\(30\)/i);
  assert.match(migrationSql, /ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE/i);
  assert.match(migrationSql, /CHECK \(ticket_type IN \('Incident','Service Request','Access Request','Maintenance Request','Change Request'\)\)/i);
  assert.match(migrationSql, /FOREIGN KEY \(sla_policy_id\) REFERENCES sla_policies\(sla_policy_id\) ON DELETE SET NULL/i);
  assert.match(migrationSql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_service_requests_ticket_number_ci/i);
  assert.match(migrationSql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_assignments_active_asset ON asset_assignments\(asset_id\) WHERE is_active = TRUE/i);
});

test('phase 4 migration backfills existing records and installs updated_at triggers', () => {
  assert.match(migrationSql, /UPDATE service_requests\s+SET ticket_number = 'NSC-'/i);
  assert.match(migrationSql, /INSERT INTO notification_preferences \(user_id\)/i);
  assert.match(migrationSql, /INSERT INTO asset_assignments \(/i);
  assert.match(migrationSql, /INSERT INTO ticket_history \(/i);
  assert.match(migrationSql, /DROP TRIGGER IF EXISTS trg_notifications_updated ON notifications;/i);
  assert.match(migrationSql, /CREATE TRIGGER trg_notifications_updated BEFORE UPDATE ON notifications/i);
});

test('phase 5 migration expands the ticket workflow schema', () => {
  assert.match(phase5MigrationSql, /ADD COLUMN IF NOT EXISTS subcategory VARCHAR\(100\)/i);
  assert.match(phase5MigrationSql, /ADD COLUMN IF NOT EXISTS source_channel VARCHAR\(20\) NOT NULL DEFAULT 'portal'/i);
  assert.match(phase5MigrationSql, /ADD COLUMN IF NOT EXISTS closure_confirmation_required BOOLEAN NOT NULL DEFAULT FALSE/i);
  assert.match(phase5MigrationSql, /ADD COLUMN IF NOT EXISTS is_internal BOOLEAN NOT NULL DEFAULT FALSE/i);
  assert.match(phase5MigrationSql, /CHECK \(status IN \(\s*'New'/i);
  assert.match(phase5MigrationSql, /ALTER COLUMN status SET DEFAULT 'New'/i);
  assert.match(phase5MigrationSql, /CREATE INDEX IF NOT EXISTS idx_service_requests_ticket_type_status/i);
});

test('phase 6 migration adds assignment tracking and escalation fields', () => {
  assert.match(phase6MigrationSql, /ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users\(user_id\)/i);
  assert.match(phase6MigrationSql, /ADD COLUMN IF NOT EXISTS expected_completion_at TIMESTAMP/i);
  assert.match(phase6MigrationSql, /ADD COLUMN IF NOT EXISTS escalation_count INTEGER NOT NULL DEFAULT 0/i);
  assert.match(phase6MigrationSql, /CREATE TABLE IF NOT EXISTS ticket_assignments/i);
  assert.match(phase6MigrationSql, /CREATE UNIQUE INDEX IF NOT EXISTS uq_ticket_assignments_active_request/i);
  assert.match(phase6MigrationSql, /event_type IN \(\s*'created',\s*'assigned',\s*'reassigned',\s*'unassigned'/i);
  assert.match(phase6MigrationSql, /notification_type IN \(\s*'ticket_assigned',\s*'ticket_updated',\s*'ticket_resolved',\s*'ticket_overdue',\s*'ticket_escalated'/i);
});

test('phase 7 migration adds delivery queue and richer notification preferences', () => {
  assert.match(phase7MigrationSql, /ADD COLUMN IF NOT EXISTS severity VARCHAR\(20\) NOT NULL DEFAULT 'info'/i);
  assert.match(phase7MigrationSql, /ADD COLUMN IF NOT EXISTS action_url VARCHAR\(255\)/i);
  assert.match(phase7MigrationSql, /CREATE TABLE IF NOT EXISTS notification_deliveries/i);
  assert.match(phase7MigrationSql, /channel IN \('email', 'sms', 'whatsapp'\)/i);
  assert.match(phase7MigrationSql, /delivery_status IN \('pending', 'processing', 'sent', 'failed', 'deferred', 'cancelled'\)/i);
  assert.match(phase7MigrationSql, /ADD COLUMN IF NOT EXISTS comment_enabled BOOLEAN NOT NULL DEFAULT TRUE/i);
  assert.match(phase7MigrationSql, /ADD COLUMN IF NOT EXISTS sla_enabled BOOLEAN NOT NULL DEFAULT TRUE/i);
  assert.match(phase7MigrationSql, /notification_type IN \(\s*'ticket_assigned',\s*'ticket_updated',\s*'ticket_resolved',\s*'ticket_comment',\s*'ticket_attachment'/i);
});

test('SLA warning migration adds one-time warning state and notification support', () => {
  assert.match(slaWarningMigrationSql, /ADD COLUMN IF NOT EXISTS response_warning_sent_at TIMESTAMP/i);
  assert.match(slaWarningMigrationSql, /ADD COLUMN IF NOT EXISTS resolution_warning_sent_at TIMESTAMP/i);
  assert.match(slaWarningMigrationSql, /ADD COLUMN IF NOT EXISTS expected_completion_escalated_at TIMESTAMP/i);
  assert.match(slaWarningMigrationSql, /'ticket_sla_warning'/i);
});

test('phase 8 migration adds maintenance schedules and asset lifecycle tracking', () => {
  assert.match(phase8MigrationSql, /ADD COLUMN IF NOT EXISTS expected_return_at TIMESTAMP/i);
  assert.match(phase8MigrationSql, /CREATE TABLE IF NOT EXISTS asset_status_history/i);
  assert.match(phase8MigrationSql, /CREATE TABLE IF NOT EXISTS maintenance_schedules/i);
  assert.match(phase8MigrationSql, /ADD COLUMN IF NOT EXISTS maintenance_type VARCHAR\(30\) NOT NULL DEFAULT 'Corrective'/i);
  assert.match(phase8MigrationSql, /ADD COLUMN IF NOT EXISTS schedule_id INTEGER REFERENCES maintenance_schedules\(schedule_id\)/i);
  assert.match(phase8MigrationSql, /notification_type IN \(\s*'ticket_assigned'/i);
  assert.match(phase8MigrationSql, /'maintenance_due'/i);
});

test('phase 9 migration expands the knowledge base with revisions, relations, and feedback', () => {
  assert.match(phase9MigrationSql, /ADD COLUMN IF NOT EXISTS category VARCHAR\(80\) NOT NULL DEFAULT 'General'/i);
  assert.match(phase9MigrationSql, /ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR\(30\) NOT NULL DEFAULT 'all_users'/i);
  assert.match(phase9MigrationSql, /CREATE TABLE IF NOT EXISTS knowledge_base_article_revisions/i);
  assert.match(phase9MigrationSql, /CREATE TABLE IF NOT EXISTS knowledge_base_article_relations/i);
  assert.match(phase9MigrationSql, /CREATE TABLE IF NOT EXISTS knowledge_base_article_feedback/i);
  assert.match(phase9MigrationSql, /CREATE INDEX IF NOT EXISTS idx_knowledge_base_title_search/i);
  assert.match(phase9MigrationSql, /Backfilled initial revision during Phase 9 migration/i);
});

test('auth hardening migration adds lockout and session version columns', () => {
  assert.match(authHardeningMigrationSql, /ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0/i);
  assert.match(authHardeningMigrationSql, /ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP/i);
  assert.match(authHardeningMigrationSql, /ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP NOT NULL DEFAULT NOW\(\)/i);
  assert.match(authHardeningMigrationSql, /ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1/i);
  assert.match(authHardeningMigrationSql, /CHECK \(failed_login_attempts >= 0\)/i);
  assert.match(authHardeningMigrationSql, /CHECK \(session_version > 0\)/i);
  assert.match(authHardeningMigrationSql, /CREATE INDEX IF NOT EXISTS idx_users_locked_until/i);
});

test('operational jobs migration adds run history table and indexes', () => {
  assert.match(operationalJobsMigrationSql, /CREATE TABLE IF NOT EXISTS operational_job_runs/i);
  assert.match(operationalJobsMigrationSql, /status IN \('running','succeeded','failed','skipped'\)/i);
  assert.match(operationalJobsMigrationSql, /metadata_json JSONB NOT NULL DEFAULT '\{\}'::jsonb/i);
  assert.match(operationalJobsMigrationSql, /CREATE INDEX IF NOT EXISTS idx_operational_job_runs_name_started/i);
  assert.match(operationalJobsMigrationSql, /CREATE INDEX IF NOT EXISTS idx_operational_job_runs_status_started/i);
});

test('phase 6 authentication hardening migration adds account status and reset tokens', () => {
  assert.match(phase6AuthHardeningMigrationSql, /ADD COLUMN IF NOT EXISTS account_status VARCHAR\(20\) NOT NULL DEFAULT 'active'/i);
  assert.match(phase6AuthHardeningMigrationSql, /account_status IN \('active','deactivated','suspended'\)/i);
  assert.match(phase6AuthHardeningMigrationSql, /CREATE TABLE IF NOT EXISTS password_reset_tokens/i);
  assert.match(phase6AuthHardeningMigrationSql, /token_hash VARCHAR\(255\) NOT NULL UNIQUE/i);
  assert.match(phase6AuthHardeningMigrationSql, /used_at TIMESTAMP/i);
  assert.match(phase6AuthHardeningMigrationSql, /CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active/i);
  assert.doesNotMatch(phase6AuthHardeningMigrationSql, /DROP TABLE|TRUNCATE/i);
});

test('phase 10 migration enforces canonical domain integrity non-destructively', () => {
  assert.match(phase10DomainIntegrityMigrationSql, /Phase 10 preflight failed/i);
  assert.match(phase10DomainIntegrityMigrationSql, /ticket_number IS NOT NULL AND ticket_number ~ '\^NSC-\[0-9\]\{4\}-\[0-9\]\{5\}\$'/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_users_temporary_account_requirements/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_users_account_state_alignment/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_service_requests_assignment_state/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_service_requests_lifecycle_dates/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_assets_archive_state/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_maintenance_status_timestamps/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_notifications_type/i);
  assert.match(phase10DomainIntegrityMigrationSql, /'maintenance_due'/i);
  assert.match(phase10DomainIntegrityMigrationSql, /status IN \('draft','in_review','published','archived'\)/i);
  assert.match(phase10DomainIntegrityMigrationSql, /chk_audit_logs_action_nonblank/i);
  assert.doesNotMatch(phase10DomainIntegrityMigrationSql, /DROP TABLE|TRUNCATE|DELETE FROM/i);
});

test('phase 10 rollback only removes new constraints and indexes', () => {
  const executableRollbackSql = phase10DomainIntegrityRollbackSql.replace(/--.*$/gm, '');
  assert.match(phase10DomainIntegrityRollbackSql, /DROP CONSTRAINT IF EXISTS chk_users_account_state_alignment/i);
  assert.match(phase10DomainIntegrityRollbackSql, /DROP CONSTRAINT IF EXISTS chk_service_requests_lifecycle_dates/i);
  assert.match(phase10DomainIntegrityRollbackSql, /DROP INDEX IF EXISTS idx_service_requests_status_changed_at/i);
  assert.doesNotMatch(executableRollbackSql, /DROP TABLE|TRUNCATE|DELETE FROM|UPDATE\s+\w+\s+SET|ALTER TABLE\s+\w+\s+DROP COLUMN/i);
});
