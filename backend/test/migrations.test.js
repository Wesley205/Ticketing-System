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
