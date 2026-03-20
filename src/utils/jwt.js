const { jwt: jwtConfig } = require('../../config');

// converts '7d', '15m', '1h' → postgres interval string
const toPostgresInterval = (expiry) => {
  const units = {
    's': 'seconds',
    'm': 'minutes',
    'h': 'hours',
    'd': 'days',
  };
  const value = parseInt(expiry);
  const unit  = expiry.slice(-1);
  return `${value} ${units[unit]}`;
};

module.exports = { toPostgresInterval };