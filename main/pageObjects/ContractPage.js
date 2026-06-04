// main/pageObjects/ContractPage.js
const { BasePage } = require('./BasePage');

class ContractPage extends BasePage {
    constructor(page, utilityFunctions, logger = console) {
        super(page, logger);
        this.utils = utilityFunctions;

        // ── LOCATOR DEFINITIONS ────────────────────────────────────────────────
        // Getters use karte hain kyunki kuch locators iframe ke andar hote hain
        // jo runtime pe resolve hone chahiye.
        this.amendButton = () => this.page.getByRole('button', { name: 'Amend', exact: true });
        this.secondAmendButton = (frame) => frame.locator('input.sbBtn[type="submit"][value="Amend"]');
    }

    contractUrl(contractId) {
        return `${process.env.SF_INSTANCE_URL}/lightning/r/Contract/${contractId}/view`;
    }

    async createContractFromOrder(orderId) {
        return await this.utils.createContractFromOrder(orderId);
    }

    async openContractRecord(contractId) {
        await this.goto(this.contractUrl(contractId), '**/lightning/r/Contract/**');
        this.log.info?.('Contract page loaded');
    }

    // FIRST Amend (Lightning contract page)
    async clickAmend() {
        await this.clickWhenVisible(this.amendButton(), { force: true });
        this.log.info?.('First Amend clicked');
        await this.page.waitForTimeout(5000);
    }

    // SECOND Amend (Amend Contract VF page, iframe ke andar)
    async clickSecondAmend() {
        this.log.info?.('Waiting for Amend Contract VF iframe...');
        const frame = await this.waitForVfFrame();
        this.log.info?.('Amend Contract VF iframe detected');

        const amendBtn = this.secondAmendButton(frame);
        await amendBtn.waitFor({ state: 'visible', timeout: 30000 });
        await amendBtn.click();
        this.log.info?.('Second Amend clicked');

        await this.page.waitForSelector('iframe[name^="vfFrameId_"][height="100%"]', { timeout: 60000 });
        this.log.info?.('QLE iframe loaded after Amendment');
    }
}

module.exports = { ContractPage };
