const rateLimit = require('express-rate-limit');

const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,             // max 100 requests per IP
  message:  { success: false, message: 'Too many requests, slow down' },
});

// stricter for auth routes — prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, message: 'Too many attempts, try later' },
});

module.exports = { defaultLimiter, authLimiter };