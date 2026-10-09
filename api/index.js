const { loadConfig } = require('../backend/src/config');
const { isStrongJwtSecret } = require('../backend/src/config/authPolicy');
const { createApp } = require('../backend/src/app');

const config = loadConfig(process.env, { isStrongJwtSecret });
const app = createApp({
  config,
  env: process.env,
  serveFrontend: false,
});

module.exports = app;
