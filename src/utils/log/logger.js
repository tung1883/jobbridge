
const { Worker } = require('worker_threads');
const worker = new Worker('./src/utils/log/loggerWorker.js'); // this need to be path from root, not from logger.js

worker.on('error', (err) => {
  console.error('Logger worker crashed:', err.message);
});

worker.on('exit', (code) => {
  if (code !== 0 && process.env.NODE_ENV !== 'test') {
    console.error(`Logger worker exited with code ${code}`);
  }
});

const logger = {
  info:  (message, meta) => worker.postMessage({ level: 'info',  message, meta }),
  warn:  (message, meta) => worker.postMessage({ level: 'warn',  message, meta }),
  error: (message, meta) => worker.postMessage({ level: 'error', message, meta }),
  close: ()              => worker.terminate(),  
};

module.exports = logger;