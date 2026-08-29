const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_PORT = 5000;
const DEFAULT_JSON_BODY_LIMIT = '6mb';
const DEFAULT_URLENCODED_BODY_LIMIT = '1mb';
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_RATE_LIMIT_MAX = 120;
const DEFAULT_DB_NAME = 'nsc_ict_system';

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function normalizeUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getDatabaseConfig(env = process.env) {
  const sslEnabled = parseBoolean(env.DB_SSL, false);

  return {
    host: env.PGHOST || 'localhost',
    port: parsePositiveInteger(env.PGPORT, 5432),
    database: env.PGDATABASE || DEFAULT_DB_NAME,
    user: env.PGUSER || 'postgres',
    password: env.PGPASSWORD || '',
    max: parsePositiveInteger(env.PGPOOL_MAX, 10),
    idleTimeoutMillis: parsePositiveInteger(env.PGIDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: parsePositiveInteger(env.PGCONNECTION_TIMEOUT_MS, 10000),
    ssl: sslEnabled ? { rejectUnauthorized: parseBoolean(env.DB_SSL_REJECT_UNAUTHORIZED, true) } : false,
  };
}

function normalizeEnv(env = process.env) {
  return {
    nodeEnv: String(env.NODE_ENV || 'development').trim().toLowerCase(),
    port: parsePositiveInteger(env.PORT, DEFAULT_PORT),
    jsonBodyLimit: String(env.JSON_BODY_LIMIT || DEFAULT_JSON_BODY_LIMIT).trim(),
    urlencodedBodyLimit: String(env.URLENCODED_BODY_LIMIT || DEFAULT_URLENCODED_BODY_LIMIT).trim(),
    rateLimitWindowMs: parsePositiveInteger(env.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
    rateLimitMax: parsePositiveInteger(env.RATE_LIMIT_MAX, DEFAULT_RATE_LIMIT_MAX),
    trustProxy: env.TRUST_PROXY || '',
    internalAppBaseUrl: normalizeUrl(env.INTERNAL_APP_BASE_URL || `http://localhost:${env.PORT || DEFAULT_PORT}`),
    corsAllowedOrigins: parseList(env.CORS_ALLOWED_ORIGINS),
    jwtSecret: env.JWT_SECRET,
    organizationEmailDomains: env.ORGANIZATION_EMAIL_DOMAINS || env.ORG_EMAIL_DOMAINS,
    database: getDatabaseConfig(env),
  };
}

function getCorsAllowedOrigins(env = process.env) {
  const config = normalizeEnv(env);
  const origins = new Set(config.corsAllowedOrigins.map(normalizeUrl));

  if (config.internalAppBaseUrl) {
    origins.add(config.internalAppBaseUrl);
  }

  if (config.nodeEnv !== 'production') {
    origins.add(`http://localhost:${config.port}`);
    origins.add(`http://127.0.0.1:${config.port}`);
  }

  return Array.from(origins).filter(Boolean);
}

function getCorsOptions(env = process.env) {
  const allowedOrigins = getCorsAllowedOrigins(env);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(normalizeUrl(origin))) {
        return callback(null, true);
      }

      return callback(new Error('CORS origin is not allowed.'));
    },
    credentials: true,
  };
}

function defaultStrongJwtSecretCheck(secret) {
  return typeof secret === 'string' && secret.length >= 32 && !/replace_with|replace_this|change[_-]?this/i.test(secret);
}

function isValidJwtExpiration(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  if (/^[1-9]\d*$/.test(raw)) return true;
  return /^[1-9]\d*(ms|s|m|h|d)$/i.test(raw);
}

function validateRuntimeConfig(env = process.env, options = {}) {
  const config = normalizeEnv(env);
  const errors = [];
  const isProduction = config.nodeEnv === 'production';
  const isStrongJwtSecret = options.isStrongJwtSecret || defaultStrongJwtSecretCheck;

  if (!config.jwtSecret) {
    errors.push('JWT_SECRET is required.');
  } else if (isProduction && !isStrongJwtSecret(config.jwtSecret)) {
    errors.push('JWT_SECRET must be a strong non-default value in production.');
  }

  if (env.JWT_EXPIRES_IN && !isValidJwtExpiration(env.JWT_EXPIRES_IN)) {
    errors.push('JWT_EXPIRES_IN must be a positive duration such as 30m, 8h, or 7d.');
  }

  if (!parseList(config.organizationEmailDomains).length) {
    errors.push('ORGANIZATION_EMAIL_DOMAINS must be configured for secure internal access.');
  }

  if (isProduction && !config.corsAllowedOrigins.length) {
    errors.push('CORS_ALLOWED_ORIGINS must be configured in production.');
  }

  if (isProduction && config.database.password === '') {
    errors.push('PGPASSWORD must be configured in production.');
  }

  if (!config.jsonBodyLimit) {
    errors.push('JSON_BODY_LIMIT must not be empty.');
  }

  if (!config.urlencodedBodyLimit) {
    errors.push('URLENCODED_BODY_LIMIT must not be empty.');
  }

  if (isProduction && config.rateLimitMax <= 0) {
    errors.push('RATE_LIMIT_MAX must be greater than zero in production.');
  }

  return {
    ok: errors.length === 0,
    errors,
    config,
  };
}

function assertRuntimeConfig(env = process.env, options = {}) {
  const result = validateRuntimeConfig(env, options);
  if (!result.ok) {
    throw new Error(result.errors.join(' '));
  }
  return result.config;
}

module.exports = {
  DEFAULT_DB_NAME,
  DEFAULT_JSON_BODY_LIMIT,
  DEFAULT_PORT,
  DEFAULT_RATE_LIMIT_MAX,
  DEFAULT_RATE_LIMIT_WINDOW_MS,
  DEFAULT_URLENCODED_BODY_LIMIT,
  assertRuntimeConfig,
  getCorsAllowedOrigins,
  getCorsOptions,
  getDatabaseConfig,
  normalizeEnv,
  parseBoolean,
  parseList,
  parsePositiveInteger,
  isValidJwtExpiration,
  validateRuntimeConfig,
};
