require('dotenv').config();

const { pool } = require('../database/pool');

module.exports = pool;
