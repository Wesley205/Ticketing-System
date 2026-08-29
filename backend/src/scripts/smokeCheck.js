const DEFAULT_BASE_URL = 'http://localhost:5000';
const DEFAULT_TIMEOUT_MS = 5000;

function getBaseUrl() {
  return (process.env.SMOKE_BASE_URL || process.env.INTERNAL_APP_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

async function fetchJson(url, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    let payload = null;

    try {
      payload = await response.json();
    } catch (err) {
      payload = null;
    }

    return {
      ok: response.ok,
      status: response.status,
      payload,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runSmokeCheck({ baseUrl = getBaseUrl(), fetcher = fetchJson } = {}) {
  const health = await fetcher(`${baseUrl}/api/health`);
  if (!health.ok || health.payload?.status !== 'ok') {
    throw new Error(`Health check failed with status ${health.status}.`);
  }

  const readiness = await fetcher(`${baseUrl}/api/health/readiness`);
  if (!readiness.ok || readiness.payload?.ready !== true) {
    throw new Error(`Readiness check failed with status ${readiness.status}.`);
  }

  return {
    status: 'ok',
    base_url: baseUrl,
    checks: ['health', 'readiness'],
  };
}

async function main() {
  try {
    const result = await runSmokeCheck();
    console.log(`[smoke] ${result.status}: ${result.checks.join(', ')} passed for ${result.base_url}`);
  } catch (err) {
    console.error(`[smoke] Failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  DEFAULT_BASE_URL,
  fetchJson,
  getBaseUrl,
  runSmokeCheck,
};
