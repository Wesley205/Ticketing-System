const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const domain = require('../src/shared/constants/domain');

const databaseDir = path.join(__dirname, '..', '..', 'database');
const migrationsDir = path.join(databaseDir, 'migrations');
const allMigrationSql = fs
  .readdirSync(migrationsDir)
  .filter((filename) => filename.endsWith('.sql'))
  .sort()
  .map((filename) => fs.readFileSync(path.join(migrationsDir, filename), 'utf8'))
  .join('\n');
const seedSql = fs.readFileSync(path.join(databaseDir, 'seed.sql'), 'utf8');

function assertSqlContainsEveryValue(sql, values, label) {
  for (const value of values) {
    assert.match(sql, new RegExp(`'${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `${label} missing ${value}`);
  }
}

test('canonical domain constants match migration-allowed values', () => {
  assertSqlContainsEveryValue(allMigrationSql, domain.TICKET_TYPES, 'ticket type migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.TICKET_STATUSES, 'ticket status migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.TICKET_PRIORITIES, 'ticket priority migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.TICKET_SOURCE_CHANNELS, 'ticket source-channel migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.ASSET_STATUSES, 'asset status migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.MAINTENANCE_STATUSES, 'maintenance status migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.MAINTENANCE_TYPES, 'maintenance type migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.USER_ROLES, 'user role migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.USER_TYPES, 'user type migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.ACCOUNT_STATUSES, 'account status migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.NOTIFICATION_TYPES, 'notification type migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.KNOWLEDGE_BASE_STATUSES, 'knowledge-base status migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.KNOWLEDGE_BASE_VISIBILITY_SCOPES, 'knowledge-base visibility migration constraints');
  assertSqlContainsEveryValue(allMigrationSql, domain.KNOWLEDGE_BASE_RELATION_TYPES, 'knowledge-base relation migration constraints');
});

test('admin-only seed remains compatible with lifecycle and domain constraints', () => {
  assert.match(seedSql, /account_status/i);
  assert.match(seedSql, /'admin'/i);
  assert.match(seedSql, /'employee'/i);
  assert.match(seedSql, /'active'/i);
  assert.match(seedSql, /notification_preferences/i);
  assert.doesNotMatch(seedSql, /account_status\s*=\s*'active'[^;]+is_active\s*=\s*FALSE/is);
});
