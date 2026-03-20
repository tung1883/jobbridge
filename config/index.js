require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

module.exports = {
  port:             process.env.PORT             || 3000,
  nodeEnv:          process.env.NODE_ENV         || 'development',
  db: {
    host:           process.env.DB_HOST          || 'localhost',
    port:           process.env.DB_PORT          || 5432,
    name:           process.env.DB_NAME,
    user:           process.env.DB_USER,
    password:       process.env.DB_PASSWORD,
  },
  jwt: {
    secret:         process.env.JWT_SECRET,
    refreshSecret:  process.env.JWT_REFRESH_SECRET,
    accessExpiry:   process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry:  process.env.JWT_REFRESH_EXPIRY || '7d',
  },
};