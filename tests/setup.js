const logger = require('../src/utils/log/logger');
const pool   = require('../config/db');

afterAll(async () => {
  await pool.end();
  logger.close();  // terminate worker so Jest can exit
});