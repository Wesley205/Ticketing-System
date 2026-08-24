// PostgreSQL connection pool.
// Reads connection details from environment variables (see .env.example).
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  database: process.env.PGDATABASE || 'nsc_ict_system',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
});

pool.on('connect', () => {
  console.log('[db] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err);
  process.exit(1);
});

module.exports = pool;
