const http = require("http");
const test = require("node:test");
const assert = require("node:assert/strict");

const { createApp } = require("../src/app");
const { normalizeEnv, validateRuntimeConfig } = require("../src/config");
const { createRateLimiter } = require("../src/middleware/rateLimit");
const {
  configureTrustProxy,
  contentTypeGuard,
  isSameHostOrigin,
} = require("../src/middleware/security");
const { requestId, sanitizeRequestId } = require("../src/middleware/requestId");

function createResponse() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

function createTestApp(env = {}) {
  const app = createApp({
    env: {
      NODE_ENV: "test",
      PORT: "5000",
      INTERNAL_APP_BASE_URL: "http://localhost:5000",
      CORS_ALLOWED_ORIGINS: "http://allowed.example",
      JSON_BODY_LIMIT: "100b",
      URLENCODED_BODY_LIMIT: "100b",
      RATE_LIMIT_MAX: "1000",
      RATE_LIMIT_WINDOW_MS: "60000",
      ...env,
    },
  });

  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function request(server, options = {}, body = "") {
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path: options.path || "/api/health",
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res) => {
        let data = "";

        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch (err) {
            parsed = null;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      },
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

test("requestId generates or preserves safe request IDs", () => {
  const req = { headers: { "x-request-id": "req-12345678" } };
  const res = createResponse();
  let nextCalled = false;

  requestId(req, res, () => {
    nextCalled = true;
  });

  assert.equal(req.requestId, "req-12345678");
  assert.equal(res.headers["X-Request-ID"], "req-12345678");
  assert.equal(nextCalled, true);
  assert.equal(sanitizeRequestId("unsafe value"), null);
});

test("configureTrustProxy applies environment proxy configuration", () => {
  const values = {};
  const app = {
    set(key, value) {
      values[key] = value;
    },
  };

  assert.equal(configureTrustProxy(app, { TRUST_PROXY: "1" }), 1);
  assert.equal(values["trust proxy"], 1);
  assert.equal(configureTrustProxy(app, { TRUST_PROXY: "true" }), true);
  assert.equal(values["trust proxy"], true);
});

test("contentTypeGuard rejects unsupported request body content types", () => {
  const req = {
    method: "POST",
    headers: { "content-length": "3" },
    requestId: "req-12345678",
    is(type) {
      return type === "text/plain";
    },
  };
  const res = createResponse();
  let nextCalled = false;
  let nextError = null;

  contentTypeGuard(req, res, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(nextError.code, "CONTENT_TYPE_UNSUPPORTED");
  assert.equal(nextError.statusCode, 415);
  assert.match(nextError.message, /Unsupported content type/);
});

test("contentTypeGuard allows empty POST requests without content type", () => {
  const req = {
    method: "POST",
    headers: { "content-length": "0" },
    requestId: "req-empty-post",
    is() {
      return false;
    },
  };
  const res = createResponse();
  let nextCalled = false;
  let nextError = null;

  contentTypeGuard(req, res, (err) => {
    nextError = err;
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(nextError, undefined);
});

test("same host origins are allowed for LAN browser asset requests", () => {
  const req = {
    protocol: "http",
    headers: { host: "192.168.1.16:5000" },
    get(name) {
      return this.headers[String(name).toLowerCase()];
    },
  };

  assert.equal(isSameHostOrigin(req, "http:/192.168.1.16:5000"), true);
  assert.equal(isSameHostOrigin(req, "https://192.168.1.16:5000"), true);
  assert.equal(isSameHostOrigin(req, "http://evil.example"), false);
});

test("same host origins are allowed behind HTTPS terminating tunnels", () => {
  const req = {
    protocol: "http",
    headers: { host: "spring-restrict-anthony-routing.trycloudflare.com" },
    get(name) {
      return this.headers[String(name).toLowerCase()];
    },
  };

  assert.equal(
    isSameHostOrigin(
      req,
      "https://spring-restrict-anthony-routing.trycloudflare.com",
    ),
    true,
  );
  assert.equal(
    isSameHostOrigin(req, "https://other-routing.trycloudflare.com"),
    false,
  );
});

test("CORS allows frontend assets requested from the same LAN host origin", async () => {
  const server = await createTestApp();

  try {
    const response = await request(server, {
      path: "/assets/main.js",
      headers: {
        Origin: `http://127.0.0.1:${server.address().port}`,
        Host: `127.0.0.1:${server.address().port}`,
      },
    });

    assert.notEqual(response.statusCode, 500);
    assert.equal(
      response.headers["access-control-allow-origin"],
      `http://127.0.0.1:${server.address().port}`,
    );
  } finally {
    await closeServer(server);
  }
});

test("rate limiter blocks requests after configured threshold", () => {
  let currentTime = 1000;
  const limiter = createRateLimiter({
    windowMs: 1000,
    max: 2,
    now: () => currentTime,
    keyGenerator: () => "client-1",
  });

  const first = createResponse();
  const second = createResponse();
  const third = createResponse();
  let calls = 0;
  let blockedError = null;

  limiter({ requestId: "req-1" }, first, () => {
    calls += 1;
  });
  limiter({ requestId: "req-2" }, second, () => {
    calls += 1;
  });
  limiter({ requestId: "req-3" }, third, (err) => {
    blockedError = err;
  });

  assert.equal(calls, 2);
  assert.equal(blockedError.code, "RATE_LIMITED");
  assert.equal(blockedError.statusCode, 429);

  currentTime = 2100;
  const reset = createResponse();
  limiter({ requestId: "req-4" }, reset, () => {
    calls += 1;
  });
  assert.equal(calls, 3);
});

test("normalizeEnv includes request middleware configuration", () => {
  const config = normalizeEnv({
    NODE_ENV: "test",
    RATE_LIMIT_WINDOW_MS: "2500",
    RATE_LIMIT_MAX: "10",
    URLENCODED_BODY_LIMIT: "20kb",
  });

  assert.equal(config.rateLimitWindowMs, 2500);
  assert.equal(config.rateLimitMax, 10);
  assert.equal(config.urlencodedBodyLimit, "20kb");
});

test("production config rejects unrestricted production CORS", () => {
  const result = validateRuntimeConfig({
    NODE_ENV: "production",
    JWT_SECRET: "a-very-long-production-secret-value", // pragma: allowlist secret
    ORGANIZATION_EMAIL_DOMAINS: "nscict.local",
    PGPASSWORD: "not-a-real-secret", // pragma: allowlist secret
  });

  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /CORS_ALLOWED_ORIGINS/);
});

test("CORS allows configured origin and rejects unknown origin", async () => {
  const server = await createTestApp();

  try {
    const allowed = await request(server, {
      headers: { Origin: "http://allowed.example" },
    });
    const rejected = await request(server, {
      headers: { Origin: "http://evil.example" },
    });

    assert.equal(allowed.statusCode, 200);
    assert.equal(
      allowed.headers["access-control-allow-origin"],
      "http://allowed.example",
    );
    assert.equal(rejected.statusCode, 500);
    assert.equal(rejected.body.success, false);
    assert.equal(rejected.body.error.code, "INTERNAL_SERVER_ERROR");
    assert.match(rejected.body.error.message, /unexpected server error/i);
    assert.equal(typeof rejected.body.meta.request_id, "string");
  } finally {
    await closeServer(server);
  }
});

test("oversized JSON payload is rejected before route handling", async () => {
  const server = await createTestApp();

  try {
    const body = JSON.stringify({ data: "x".repeat(200) });
    const response = await request(
      server,
      {
        path: "/api/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      body,
    );

    assert.equal(response.statusCode, 413);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, "PAYLOAD_TOO_LARGE");
    assert.equal(response.body.meta.request_id !== null, true);
  } finally {
    await closeServer(server);
  }
});
