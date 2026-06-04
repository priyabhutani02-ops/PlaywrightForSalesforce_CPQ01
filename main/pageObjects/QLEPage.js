// main/pageObjects/QLEPage.js
// Quote Line Editor (QLE) — Salesforce CPQ ka heavy shadow-DOM screen.
// Deep-find / evaluate logic intentionally as-is rakhi hai (hard-won, working).
const { BasePage } = require('./BasePage');
const { product } = require('../utilities/testData');

class QLEPage extends BasePage {
    constructor(page, logger = console) {
        super(page, logger);

        // ── LOCATOR DEFINITIONS ────────────────────────────────────────────────
        // QLE ek VF iframe ke andar render hota hai; isliye frame getter + locators.
        this.qleIframe = 'iframe[name^="vfFrameId_"][height="100%"]';
        this.frame = () => this.page.frameLocator(this.qleIframe);

        this.editLinesButton  = () => this.page.locator('button.slds-button:has-text("Edit Lines")');
        this.addProductsButton = () => this.frame().getByRole('button', { name: 'Add Products' });
        this.calculateButton  = () => this.frame().getByRole('button', { name: 'Calculate' });
        this.saveButton       = () => this.frame().getByRole('button', { name: 'Save', exact: true });
        this.plSelectButton   = () => this.frame().locator('paper-button#plSelect');
        this.productSpan      = (code) => this.frame().locator(`span#me:has-text("${code}")`);
    }

    quoteUrl(quoteId) {
        return `${process.env.SF_INSTANCE_URL}/lightning/r/SBQQ__Quote__c/${quoteId}/view`;
    }

    async openQuoteRecord(quoteId) {
        await this.goto(this.quoteUrl(quoteId), '**/lightning/r/SBQQ__Quote__c/**');
        this.log.info?.('Quote record page loaded');
    }

    async clickEditLines() {
        const btn = this.editLinesButton();
        await btn.waitFor({ timeout: 20000 });
        await btn.click();
        this.log.info?.('Edit Lines clicked');
        await this.page.waitForSelector(this.qleIframe, { timeout: 30000 });
        this.log.info?.('QLE iframe detected');
    }

    async handlePricebookDialog() {
        await this.forceClosePricebookPopup();

        const frame = this.frame();
        await frame.getByRole('button', { name: 'Add Products' }).waitFor({ timeout: 60000 });

        const sbFrame = this.page.frames().find(f => f.url().includes('/apex/sb?'));
        if (sbFrame) {
            const clicked = await sbFrame.evaluate(() => {
                function deepFindAll(root, selector, results = []) {
                    results.push(...root.querySelectorAll(selector));
                    for (const node of root.querySelectorAll('*')) {
                        if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                    }
                    return results;
                }
                const saveBtn = deepFindAll(document, 'paper-button[slot="paper-button"].primary')[0];
                if (!saveBtn) return 'no-primary-btn';
                saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
                return 'clicked-primary-save';
            });
            this.log.info?.(`Pricebook result: ${clicked}`);
            await this.page.waitForTimeout(3000);
        }

        await frame.getByRole('button', { name: 'Add Products' }).waitFor({ timeout: 30000 });
        this.log.info?.('QLE fully loaded');
    }

    async forceClosePricebookPopup() {
        await this.page.waitForTimeout(3000);
        const sbFrame = this.page.frames().find(f => f.url().includes('/apex/sb?'));
        if (!sbFrame) {
            this.log.info?.('QLE frame not found while checking pricebook popup');
            return;
        }

        for (let i = 1; i <= 5; i++) {
            const result = await sbFrame.evaluate(() => {
                function deepFindAll(root, selector, results = []) {
                    if (!root) return results;
                    results.push(...root.querySelectorAll(selector));
                    for (const node of root.querySelectorAll('*')) {
                        if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                    }
                    return results;
                }
                const dialogs = deepFindAll(document, 'sb-pricebook-dialog');
                const visibleDialog = dialogs.find(d => {
                    const r = d.getBoundingClientRect();
                    return r.width > 0 && r.height > 0;
                });
                if (!visibleDialog) return 'no-visible-pricebook-dialog';

                const buttons = deepFindAll(document, 'paper-button, button');
                const saveBtn = buttons.find(btn => {
                    const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
                    return text === 'save';
                });
                if (!saveBtn) return 'save-button-not-found';

                saveBtn.click();
                saveBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, composed: true, cancelable: true }));
                saveBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, composed: true, cancelable: true }));
                saveBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
                return 'pricebook-save-clicked';
            });

            this.log.info?.(`Force pricebook attempt ${i}: ${result}`);
            await this.page.waitForTimeout(4000);
            if (result === 'no-visible-pricebook-dialog') break;
        }
    }

    async clickAddProducts(productCode = product.code) {
        const frame = this.frame();
        await this.forceClosePricebookPopup();
        await frame.getByRole('button', { name: 'Add Products' }).click();
        this.log.info?.('Add Products clicked');
        await frame.locator(`span#me:has-text("${productCode}")`).waitFor({ timeout: 30000 });
        this.log.info?.(`Product catalog loaded — looking for: ${productCode}`);
    }

    async clickAddProductsWithSearch(productCode) {
        const frame = this.frame();
        await frame.getByRole('button', { name: 'Add Products' }).click();
        this.log.info?.('Add Products clicked');
        await this.page.waitForTimeout(3000);

        const sbFrame = this.page.frames().find(f => f.url().includes('/apex/sb?'));
        if (!sbFrame) throw new Error('❌ QLE frame not found');

        const fillResult = await sbFrame.evaluate((code) => {
            function deepFindAll(root, selector, results = []) {
                results.push(...root.querySelectorAll(selector));
                for (const node of root.querySelectorAll('*')) {
                    if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                }
                return results;
            }
            const inputs = deepFindAll(document, 'input#itemLabel').filter(i => i.placeholder === 'Search Products');
            const input = inputs.find(i => i.offsetParent !== null);
            if (!input) return 'input-not-found';
            input.focus(); input.click();
            const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeSetter.call(input, code);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            return 'filled';
        }, productCode);
        this.log.info?.(`Search input result: ${fillResult}`);
        await this.page.waitForTimeout(1000);

        const searchResult = await sbFrame.evaluate(() => {
            function deepFindAll(root, selector, results = []) {
                results.push(...root.querySelectorAll(selector));
                for (const node of root.querySelectorAll('*')) {
                    if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                }
                return results;
            }
            const searchBtns = deepFindAll(document, 'paper-button#search').filter(btn => btn.offsetParent !== null);
            const btn = searchBtns[0];
            if (!btn) return 'btn-not-found';
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            return 'clicked';
        });
        this.log.info?.(`Search button result: ${searchResult}`);
        await this.page.waitForTimeout(2000);

        let found = false;
        for (let i = 0; i < 15; i++) {
            found = await sbFrame.evaluate((code) => {
                function deepFindAll(root, selector, results = []) {
                    results.push(...root.querySelectorAll(selector));
                    for (const node of root.querySelectorAll('*')) {
                        if (node.shadowRoot) deepFindAll(node.shadowRoot, selector, results);
                    }
                    return results;
                }
                const spans = deepFindAll(document, 'span#me');
                return spans.some(s => s.textContent.trim().toUpperCase() === code.toUpperCase());
            }, productCode);
            if (found) break;
            this.log.info?.(`Waiting for product... attempt ${i + 1}/15`);
            await this.page.waitForTimeout(1000);
        }
        if (!found) throw new Error(`❌ Product not found after search: ${productCode}`);
        this.log.info?.(`Product found: ${productCode}`);
    }

    async selectProduct(productCode = product.code) {
        const frame = this.frame();
        const productCheckbox = frame
            .locator('sb-swipe-container')
            .filter({ has: frame.locator(`span#me:has-text("${productCode}")`) })
            .getByRole('checkbox');

        await productCheckbox.waitFor({ timeout: 20000 });
        await productCheckbox.click();
        this.log.info?.(`Product ${productCode} selected`);

        await frame.locator('paper-button#plSelect').click();
        this.log.info?.('Select clicked — product added to QLE');

        await frame.locator(`span#me:has-text("${productCode}")`).first().waitFor({ timeout: 30000 });
        this.log.info?.('Product line appeared in QLE');
    }

    async clickCalculate() {
        const calcBtn = this.calculateButton();
        await calcBtn.waitFor({ timeout: 30000 });
        await calcBtn.click({ force: true });
        this.log.info?.('Calculate clicked');
        await this.page.waitForTimeout(5000);
        this.log.info?.('Pricing calculated');
    }

    async saveQuoteLines() {
        const saveBtn = this.saveButton();
        await saveBtn.waitFor({ timeout: 30000 });
        await saveBtn.click({ force: true });
        this.log.info?.('Save clicked');
        await this.page.waitForURL('**/lightning/r/SBQQ__Quote__c/**', { timeout: 60000 });
        await this.page.waitForTimeout(5000);
        this.log.info?.('Quote Lines saved successfully');
    }
}

module.exports = { QLEPage };
