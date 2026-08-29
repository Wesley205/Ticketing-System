const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..', '..', '..');
const DEFAULT_EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'storage',
]);
const DEFAULT_EXCLUDED_FILES = new Set([
  'package-lock.json',
]);
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.env',
  '.example',
  '.html',
  '.js',
  '.json',
  '.md',
  '.sql',
  '.txt',
  '.yaml',
  '.yml',
]);
const TEXT_FILENAMES = new Set([
  '.env',
  '.env.example',
  'Dockerfile',
]);
const SECRET_ASSIGNMENT_PATTERN =
  /\b([A-Z0-9_]*(?:PASSWORD|TOKEN|SECRET|API[_-]?KEY|PRIVATE[_-]?KEY|SMTP_PASS|PGPASSWORD|JWT_SECRET)[A-Z0-9_]*)\b\s*[:=]\s*["']?([^"'\s#]{12,})/g;
const PRIVATE_KEY_PATTERN = /-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const SAFE_PLACEHOLDER_PATTERN = /(replace|placeholder|example|changeme|change[_-]?this|your_|local|localhost|nscict\.local)/i;
const ALLOWLIST_COMMENT_PATTERN = /pragma:\s*allowlist\s+secret/i;

function shouldSkipPath(filePath, root = repoRoot) {
  const relative = path.relative(root, filePath);
  const parts = relative.split(path.sep);

  return parts.some((part) => DEFAULT_EXCLUDED_DIRS.has(part)) ||
    DEFAULT_EXCLUDED_FILES.has(path.basename(filePath));
}

function isTextCandidate(filePath) {
  const basename = path.basename(filePath);
  const extension = path.extname(filePath);

  return TEXT_FILENAMES.has(basename) || TEXT_EXTENSIONS.has(extension);
}

function walkFiles(directory, root = repoRoot, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (shouldSkipPath(fullPath, root)) continue;

    if (entry.isDirectory()) {
      walkFiles(fullPath, root, files);
    } else if (entry.isFile() && isTextCandidate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanTextForSecrets(text) {
  const findings = [];

  if (PRIVATE_KEY_PATTERN.test(text)) {
    findings.push({ key: 'PRIVATE_KEY_BLOCK' });
  }

  for (const line of text.split(/\r?\n/)) {
    if (ALLOWLIST_COMMENT_PATTERN.test(line)) continue;

    let match;
    SECRET_ASSIGNMENT_PATTERN.lastIndex = 0;
    while ((match = SECRET_ASSIGNMENT_PATTERN.exec(line)) !== null) {
      const [, key, value] = match;

      if (SAFE_PLACEHOLDER_PATTERN.test(value)) continue;

      findings.push({ key });
    }
  }

  return findings;
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  return scanTextForSecrets(text).map((finding) => ({
    ...finding,
    file: path.relative(repoRoot, filePath),
  }));
}

function scanRepository(root = repoRoot) {
  const findings = [];

  for (const filePath of walkFiles(root, root)) {
    try {
      findings.push(...scanFile(filePath));
    } catch (err) {
      if (err.code !== 'EISDIR') throw err;
    }
  }

  return findings;
}

function main() {
  const findings = scanRepository();

  if (findings.length > 0) {
    console.error('[secret-scan] Potential committed secret(s) found:');
    for (const finding of findings) {
      console.error(`- ${finding.file}: ${finding.key}`);
    }
    process.exit(1);
  }

  console.log('[secret-scan] No committed secrets detected.');
}

if (require.main === module) {
  main();
}

module.exports = {
  scanRepository,
  scanTextForSecrets,
  shouldSkipPath,
  walkFiles,
  isTextCandidate,
};
