// main/pageObjects/LoginPage.js
const { expect } = require('@playwright/test');
const { BasePage } = require('./BasePage');

class LoginPage extends BasePage {
    constructor(page, logger = console) {
        super(page, logger);
    }

    // Login via JWT access token (frontdoor). Note: bulk runs storageState
    // (auth.setup.js) use karte hain, ye direct login fallback/standalone hai.
    async loginWithToken(accessToken) {
        const instance = process.env.SF_INSTANCE_URL || process.env.SALESFORCE_INSTANCE;
        const frontdoorUrl = `${instance}/secur/frontdoor.jsp?sid=${accessToken}&retURL=/lightning/page/home`;
        await this.page.goto(frontdoorUrl, { waitUntil: 'load' });
        await this.page.waitForURL(/.*lightning\/.*/, { timeout: 30000 });
        expect(this.page.url()).toMatch(/lightning/);
        this.log.info?.('Login successful');
    }
}

module.exports = { LoginPage };
