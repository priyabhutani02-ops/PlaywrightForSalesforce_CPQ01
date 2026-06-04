const path = require('path');
const { defineConfig } = require('@playwright/test');
const { loadConfig } = require('./config/loadConfig');

// Loads .env (secrets) + config/settings.json (Excel settings) into process.env.
// Runs in main process AND every worker (Playwright re-requires this file).
loadConfig();

// ── ENV-DRIVEN TOGGLES ──────────────────────────────────────────────────────
// CI / bulk runs ke liye: HEADLESS=true WORKERS=8 npx playwright test
// Demo ke liye:           HEADLESS=false SLOWMO=800 npx playwright test
const HEADLESS = process.env.HEADLESS !== 'false';            // default headless (bulk-friendly)
const SLOWMO   = parseInt(process.env.SLOWMO || '0', 10);
const WORKERS  = process.env.WORKERS ? parseInt(process.env.WORKERS, 10) : undefined;
const AUTH_FILE = path.resolve(process.cwd(), '.auth', 'user.json');

module.exports = defineConfig({
    testDir: './tests',

    // 100 tests ek saath chalane ke liye: parallel + multiple workers.
    fullyParallel: true,
    workers: WORKERS,                 // undefined => Playwright auto (CPU based)
    retries: parseInt(process.env.RETRIES || '1', 10),
    timeout: 5 * 60 * 1000,           // 5 min per test (CPQ flows lambe hote hain)
    expect: { timeout: 30 * 1000 },

    // ── REPORTING ───────────────────────────────────────────────────────────
    // HTML report (assertions + steps dikhte hain), JSON, aur console list.
    reporter: [
        ['list'],
        ['html', { outputFolder: 'reports/html-report', open: 'never' }],
        ['json', { outputFile: 'reports/results.json' }],
        ['junit', { outputFile: 'reports/junit.xml' }]
    ],

    outputDir: 'reports/artifacts',

    use: {
        headless: HEADLESS,
        launchOptions: { slowMo: SLOWMO },
        browserName: 'chromium',

        actionTimeout: 30 * 1000,
        navigationTimeout: 30 * 1000,

        screenshot: 'only-on-failure',
        video: process.env.VIDEO === 'on' ? 'on' : 'retain-on-failure',
        trace: 'retain-on-failure',

        locale: 'en-IN',
        timezoneId: 'Asia/Kolkata',
        geolocation: { latitude: 28.6139, longitude: 77.2090 },
        permissions: ['geolocation'],
        viewport: { width: 1600, height: 900 }
    },

    projects: [
        // 1) Login ek baar -> session save
        { name: 'setup', testMatch: /auth\.setup\.js/ },

        // 2) Actual tests -> saved session reuse, dobara login nahi
        {
            name: 'chromium',
            testIgnore: /auth\.setup\.js/,
            dependencies: ['setup'],
            use: { storageState: AUTH_FILE }
        }
    ]
});
