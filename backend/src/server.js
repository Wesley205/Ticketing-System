require('dotenv').config();

const { isStrongJwtSecret } = require('./config/authPolicy');
const { loadConfig } = require('./config');
const { logInfo } = require('./utils/logger');

function createHttpServer(app, config) {
  return app.listen(config.port, () => {
    logInfo('server_started', {
      port: config.port,
      node_env: config.nodeEnv,
    });
  });
}

function startBackgroundJobs({ pool }) {
  const { startExpirySweep } = require('./utils/accountExpiry');
  const { logAction } = require('./utils/audit');
  const { startNotificationQueue } = require('./utils/notificationProcessor');
  const { startMaintenanceMonitor } = require('./utils/maintenanceMonitor');
  const { startSlaMonitor } = require('./utils/slaMonitor');

  startExpirySweep({ pool, logAction });
  startNotificationQueue({ pool });
  startMaintenanceMonitor({ pool, logAction });
  startSlaMonitor({ pool, logAction });
}

async function shutdownServer({ server, pool, signal, exit = false }) {
  logInfo('server_shutdown_started', { signal });

  await new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  if (pool && typeof pool.end === 'function') {
    await pool.end();
  }

  logInfo('server_shutdown_completed', { signal });

  if (exit) {
    process.exit(0);
  }
}

function registerSignalHandlers({ server, pool }) {
  const handler = (signal) => {
    shutdownServer({ server, pool, signal, exit: true }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  };

  process.once('SIGTERM', () => handler('SIGTERM'));
  process.once('SIGINT', () => handler('SIGINT'));
}

function startServer(options = {}) {
  const config = options.config || loadConfig(process.env, { isStrongJwtSecret });
  const { createApp } = options.createAppModule || require('./app');
  const app = options.app || createApp({ config, env: process.env });
  const pool = options.pool || require('./config/db');
  const server = options.server || createHttpServer(app, config);

  if (options.startJobs !== false) {
    startBackgroundJobs({ pool });
  }

  if (options.registerSignals !== false) {
    registerSignalHandlers({ server, pool });
  }

  return {
    app,
    config,
    pool,
    server,
  };
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createHttpServer,
  registerSignalHandlers,
  shutdownServer,
  startBackgroundJobs,
  startServer,
};
