const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

const migrationsDir = path.join(__dirname, '..', '..', '..', 'database', 'migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations() {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

async function applyMigration(filename) {
  const fullPath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(fullPath, 'utf8');

  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await pool.query('COMMIT');
    console.log(`[migrate] Applied ${filename}`);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
}

async function main() {
  if (!fs.existsSync(migrationsDir)) {
    console.log('[migrate] No migrations directory found.');
    return;
  }

  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = fs.readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    if (!applied.has(filename)) {
      await applyMigration(filename);
    }
  }

  console.log('[migrate] Migration check complete.');
}

main()
  .catch((err) => {
    console.error('[migrate] Failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
