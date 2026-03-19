const logger = require('../utils/logger');
const { scrub } = require('../utils/sanitize');

const httpLogger = (req, res, next) => {
    const start = Date.now();

    // override res so that res.json also returns the response body for logging
    const originalJson = res.json.bind(res);
    let responseBody;
    res.json = (body) => {
        responseBody = body;
        return originalJson(body);
    };

    res.on('finish', () => {
        const duration = Date.now() - start;
        const meta = {
            method:       req.method,
            url:          req.url,
            status:       res.statusCode,
            duration:     `${duration}ms`,
            ip:           req.ip,
            userAgent:    req.get('User-Agent'),
            requestBody:  scrub(req.body),
            responseBody: scrub(responseBody),
        };
        
        logger.info('HTTP request', meta);         

        if (res.statusCode >= 500) {
            logger.error('HTTP server error', meta);   
        } else if (res.statusCode >= 400) {
            logger.warn('HTTP client error', meta);   
        }
    });
        
    next();
};

module.exports = httpLogger;