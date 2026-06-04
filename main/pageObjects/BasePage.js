// main/pageObjects/BasePage.js
// Saare page objects isko extend karenge. Common reusable actions yahan ek baar.
// Locators har page apne constructor mein "definitions" ke roop mein rakhega
// (point: page objects mein proper definitions honi chahiye).

class BasePage {
    /**
     * @param {import('@playwright/test').Page} page
     * @param {object} [logger]  per-test logger (optional)
     */
    constructor(page, logger = console) {
        this.page = page;
        this.log = logger;
    }

    async goto(url, urlPattern, timeout = 30000) {
        this.log.info?.(`Navigating → ${url}`);
        await this.page.goto(url, { waitUntil: 'load' });
        if (urlPattern) {
            await this.page.waitForURL(urlPattern, { timeout });
        }
    }

    /** Visible hone tak wait karke click. force optional. */
    async clickWhenVisible(locator, { timeout = 20000, force = false } = {}) {
        await locator.scrollIntoViewIfNeeded().catch(() => {});
        await locator.waitFor({ state: 'visible', timeout });
        await locator.click({ force });
    }

    /** VF iframe (Salesforce CPQ) ka frame locator. */
    vfFrame(selector = 'iframe[name^="vfFrameId_"]') {
        return this.page.frameLocator(selector);
    }

    async waitForVfFrame(selector = 'iframe[name^="vfFrameId_"]', timeout = 30000) {
        await this.page.waitForSelector(selector, { timeout });
        return this.vfFrame(selector);
    }
}

module.exports = { BasePage };
