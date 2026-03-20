const logger = require('../src/utils/log/logger');
const pool   = require('../config/db');
const { randomUUID, randomInt } = require('crypto');

function generateTestingEmail() {
  return `testuser_${Date.now()}_${randomInt(1000)}_${randomUUID()}@example.com`;
}

afterAll(async () => {
  await pool.end();
  logger.close();  // terminate worker so Jest can exit
});

module.exports = {
  generateTestingEmail
};