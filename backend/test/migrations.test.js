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
