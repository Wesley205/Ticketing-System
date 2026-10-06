const fs = require('fs');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const repoRoot = path.join(__dirname, '..', '..');

function readRepoFile(...parts) {
  return fs.readFileSync(path.join(repoRoot, ...parts), 'utf8');
}

test('Dockerfile packages the backend for production safely', () => {
  const dockerfile = readRepoFile('Dockerfile');

  assert.match(dockerfile, /FROM node:20-bookworm-slim/);
  assert.match(dockerfile, /ENV NODE_ENV=production/);
  assert.match(dockerfile, /COPY backend \.\/backend/);
  assert.match(dockerfile, /COPY frontend\/dist \.\/frontend\/dist/);
  assert.match(dockerfile, /COPY database\/migrations \.\/database\/migrations/);
  assert.match(dockerfile, /require\('\.\/backend\/node_modules\/web-push'\)/);
  assert.match(dockerfile, /USER node/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /CMD \["node", "src\/server\.js"\]/);
});

test('docker ignore excludes secrets, frontend dependencies, and runtime attachments', () => {
  const dockerignore = readRepoFile('.dockerignore');

  assert.match(dockerignore, /backend\/\.env/);
  assert.match(dockerignore, /\.env\.\*/);
  assert.doesNotMatch(dockerignore, /backend\/node_modules/);
  assert.match(dockerignore, /frontend\/node_modules/);
  assert.doesNotMatch(dockerignore, /frontend\/dist/);
  assert.match(dockerignore, /storage\/ticket-attachments/);
});

test('compose example wires app, postgres, health, and durable volumes without fixed secrets', () => {
  const compose = readRepoFile('deploy', 'docker-compose.example.yml');

  assert.match(compose, /image: postgres:16-alpine/);
  assert.match(compose, /condition: service_healthy/);
  assert.match(compose, /PGHOST: postgres/);
  assert.match(compose, new RegExp(['PGPASSWORD', ': \\$\\{NSC_DB_PASSWORD:\\?set NSC_DB_PASSWORD\\}'].join('')));
  assert.match(compose, new RegExp(['JWT_SECRET', ': \\$\\{NSC_JWT_SECRET:\\?set NSC_JWT_SECRET\\}'].join('')));
  assert.match(compose, /attachment-data:\/app\/storage\/ticket-attachments/);
});

test('deployment docs include backup and smoke verification guidance', () => {
  const deployment = readRepoFile('docs', 'deployment', 'deployment.md');
  const backup = readRepoFile('docs', 'deployment', 'backup-restore.md');

  assert.match(deployment, /docker build -t nsc-ict-service-desk:local/);
  assert.match(deployment, /npm run migrate/);
  assert.match(deployment, /SMOKE_BASE_URL=http:\/\/localhost:5000 npm run smoke/);
  assert.match(backup, /pg_dump --format=custom/);
  assert.match(backup, /pg_restore --dbname=nsc_ict_restore_test/);
  assert.match(backup, /No destructive purge process should be added/);
});
