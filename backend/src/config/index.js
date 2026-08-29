const env = require('./env');

function loadConfig(sourceEnv = process.env, options = {}) {
  return env.assertRuntimeConfig(sourceEnv, options);
}

module.exports = {
  ...env,
  loadConfig,
};
