const { parentPort } = require('worker_threads');
const winston = require('winston');
const { combine, timestamp, colorize, printf, json } = winston.format;

const httpFormat = printf(({ timestamp, method, url, status, duration, ip, userAgent }) => {
    return `[${timestamp}] ${method} ${url} ${status} - ${duration} | IP: ${ip} | ${userAgent}`;
});

const appFormat = printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
});

const chooseFormat = printf((info) => {
    if (info.method && info.url) {
        return httpFormat.transform(info)[Symbol.for('message')];
    } 
    
    return appFormat.transform(info)[Symbol.for('message')];
});

const logger = winston.createLogger({
    transports: [
        new winston.transports.Console({
            format: combine(timestamp(), colorize(), chooseFormat),
        }),
        new winston.transports.File({
            filename: 'logs/requests.log',
            level: 'info',
            format: combine(timestamp(), json()),
        }),
        new winston.transports.File({
            filename: 'logs/errors.log',
            level: 'error',
            format: combine(timestamp(), json()),
        }),
        new winston.transports.File({
            filename: 'logs/warns.log',
            level: 'warn',
            format: combine(timestamp(), json()),
        })
    ]
});

parentPort.on('message', ({ level, message, meta }) => {
    logger[level](message, meta);
});