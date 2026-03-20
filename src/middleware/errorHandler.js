const logger = require('../utils/log/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(err.message, { stack: err.stack, url: req.url });

  // in dev — show full error details
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message,
      stack:   err.stack,
      ...err.context,
    });
  }

  // in prod — generic message, nothing leaked
  return res.status(err.status || 500).json({
    success: false,
    message: 'Something went wrong',
  });
};

module.exports = errorHandler;