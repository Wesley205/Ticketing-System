const fs = require("fs");
const path = require("path");
const express = require("express");
const { getStaticOptions } = require("./securityHeaders");

const LEGACY_FRONTEND_REDIRECTS = Object.freeze({
  "/index.html": "/login",
  "/register.html": "/activate",
  "/dashboard.html": "/dashboard",
  "/service-requests.html": "/service-requests",
  "/technician.html": "/technician",
  "/assets.html": "/assets",
  "/maintenance.html": "/maintenance",
  "/staff.html": "/staff",
  "/departments.html": "/departments",
  "/knowledge-base.html": "/knowledge-base",
  "/reports.html": "/reports",
  "/audit-log.html": "/audit-logs",
  "/about.html": "/about",
});

function resolveFrontendPaths(
  rootDir = path.join(__dirname, "..", "..", ".."),
) {
  const frontendPath = path.join(rootDir, "frontend");
  const reactBuildPath = path.join(frontendPath, "dist");
  const reactShellPath = path.join(reactBuildPath, "react-shell.html");

  return {
    frontendPath,
    reactBuildPath,
    reactShellPath,
  };
}

function getFrontendShellPath(paths = resolveFrontendPaths()) {
  if (fs.existsSync(paths.reactShellPath)) {
    return paths.reactShellPath;
  }

  return null;
}

function shouldServeFrontendFallback(req) {
  if (req.path.startsWith("/api/")) return false;
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  if (path.extname(req.path)) return false;
  return true;
}

function buildLegacyRedirectTarget(req) {
  const target = LEGACY_FRONTEND_REDIRECTS[req.path];
  if (!target) return null;

  const queryIndex = req.originalUrl ? req.originalUrl.indexOf("?") : -1;
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : "";
  return `${target}${query}`;
}

function configureFrontendServing(app, options = {}) {
  const paths = resolveFrontendPaths(options.rootDir);
  const staticOptions = {
    ...getStaticOptions(options.env),
    redirect: false,
  };

  app.use(express.static(paths.reactBuildPath, staticOptions));
  app.get(Object.keys(LEGACY_FRONTEND_REDIRECTS), (req, res) => {
    res.redirect(308, buildLegacyRedirectTarget(req));
  });
  app.get("*", (req, res, next) => {
    if (!shouldServeFrontendFallback(req)) return next();
    const shellPath = getFrontendShellPath(paths);
    if (!shellPath) {
      return res
        .status(503)
        .send(
          "React frontend build is not available. Run the frontend production build before starting the server.",
        );
    }
    return res.sendFile(shellPath);
  });

  return paths;
}

module.exports = {
  LEGACY_FRONTEND_REDIRECTS,
  buildLegacyRedirectTarget,
  configureFrontendServing,
  getFrontendShellPath,
  resolveFrontendPaths,
  shouldServeFrontendFallback,
};
