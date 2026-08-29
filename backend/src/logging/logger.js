const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|session|credential|api[_-]?key|sql|query|statement|connectionstring|databaseurl)/i;
const MAX_STRING_LENGTH = 1000;

function redactSensitive(value, depth = 0) {
  if (depth > 6) return '[MaxDepth]';
  if (value === null || value === undefined) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      code: value.code,
      status: value.status || value.statusCode,
      is_operational: value.isOperational,
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.entries(value).reduce((acc, [key, item]) => {
      acc[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? '[REDACTED]'
        : redactSensitive(item, depth + 1);
      return acc;
    }, {});
  }

  if (typeof value === 'string' && value.length > MAX_STRING_LENGTH) {
    return `${value.slice(0, MAX_STRING_LENGTH)}...`;
  }

  return value;
}

function buildLogEntry(level, event, fields = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactSensitive(fields),
  };
}

function writeLog(level, event, fields = {}) {
  const entry = buildLogEntry(level, event, fields);
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

function logInfo(event, fields = {}) {
  writeLog('info', event, fields);
}

function logError(event, error, fields = {}) {
  writeLog('error', event, {
    ...fields,
    error: redactSensitive(error),
  });
}

module.exports = {
  buildLogEntry,
  logError,
  logInfo,
  redactSensitive,
};
