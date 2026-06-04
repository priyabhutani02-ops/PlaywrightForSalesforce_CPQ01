// tests/auth.setup.js
// Ye sirf EK BAAR chalta hai (setup project). Login karke session ko
// .auth/user.json mein save karta hai. Baaki saare tests is storageState ko
// reuse karte hain -> har test mein dobara login nahi hota.

const { test, expect } = require('@playwright/test');
const setup = test;
const fs = require('fs');
const path = require('path');
const { UtilityFunctions } = require('../main/utilities/UtilityFunctions');
const { getLogger } = require('../utils/logger');

const AUTH_FILE = path.resolve(process.cwd(), '.auth', 'user.json');

setup('authenticate once', async ({ page }) => {
    const log = getLogger('AUTH_SETUP');

    const dir = path.dirname(AUTH_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const utils = new UtilityFunctions('AUTH_SETUP');
    const token = await utils.getAccessToken();
    log.info('Access token acquired');

    const instance = process.env.SF_INSTANCE_URL || process.env.SALESFORCE_INSTANCE;
    const frontdoorUrl = `${instance}/secur/frontdoor.jsp?sid=${token}&retURL=/lightning/page/home`;

    await page.goto(frontdoorUrl, { waitUntil: 'load' });
    await page.waitForURL(/.*lightning\/.*/, { timeout: 30000 });
    expect(page.url()).toMatch(/lightning/);
    log.info('Lightning home loaded — session established');

    await page.context().storageState({ path: AUTH_FILE });
    log.info(`Session saved → ${AUTH_FILE}`);
});

module.exports = { AUTH_FILE };
