// utils/logger.js
// Centralised logger. Har run ke liye ek alag timestamped folder banta hai:
//   logs/run-YYYY-MM-DD_HH-mm-ss/combined.log
//   logs/run-YYYY-MM-DD_HH-mm-ss/error.log
// Console pe bhi readable output aata hai.

const fs = require('fs');
const path = require('path');
const winston = require('winston');

function timestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Ek hi run folder poore process ke liye (sab tests isi mein likhenge).
const RUN_ID = process.env.RUN_ID || timestamp();
const RUN_DIR = path.resolve(process.cwd(), 'logs', `run-${RUN_ID}`);

if (!fs.existsSync(RUN_DIR)) {
    fs.mkdirSync(RUN_DIR, { recursive: true });
}

const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, test }) => {
        const tag = test ? `[${test}] ` : '';
        return `${timestamp} ${level.toUpperCase().padEnd(5)} ${tag}${message}`;
    })
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, test }) => {
        const tag = test ? `[${test}] ` : '';
        return `${level} ${tag}${message}`;
    })
);

const baseLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    transports: [
        new winston.transports.File({ filename: path.join(RUN_DIR, 'combined.log'), format: fileFormat }),
        new winston.transports.File({ filename: path.join(RUN_DIR, 'error.log'), level: 'error', format: fileFormat }),
        new winston.transports.Console({ format: consoleFormat })
    ]
});

/**
 * Per-test child logger. `testName` har line mein tag ho jaata hai.
 * Usage: const log = getLogger('CPQ_Amendment_Flow');
 *        log.info('Login successful');
 */
function getLogger(testName = '') {
    return baseLogger.child({ test: testName });
}

module.exports = { getLogger, RUN_DIR, RUN_ID };
