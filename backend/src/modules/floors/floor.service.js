const pool = require('../../config/db');
const repository = require('./floor.repository');

async function listFloors(options = {}, executor = pool) {
  return repository.listFloors(executor, options);
}

module.exports = {
  listFloors,
};
