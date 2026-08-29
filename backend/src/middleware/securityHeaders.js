const ONE_HOUR_SECONDS = 60 * 60;

function buildContentSecurityPolicy() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', buildContentSecurityPolicy());
  next();
}

function getStaticOptions(env = process.env) {
  const isProduction = String(env.NODE_ENV || '').toLowerCase() === 'production';

  return {
    etag: true,
    maxAge: isProduction ? `${ONE_HOUR_SECONDS}s` : 0,
    setHeaders(res, filePath) {
      if (/\.html?$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'no-store');
        return;
      }

      if (isProduction) {
        res.setHeader('Cache-Control', `public, max-age=${ONE_HOUR_SECONDS}`);
      }
    },
  };
}

module.exports = {
  ONE_HOUR_SECONDS,
  buildContentSecurityPolicy,
  getStaticOptions,
  securityHeaders,
};
