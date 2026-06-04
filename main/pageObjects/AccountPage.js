// main/pageObjects/AccountPage.js
const { BasePage } = require('./BasePage');

class AccountPage extends BasePage {
    constructor(page, utils, logger = console) {
        super(page, logger);
        this.utils = utils;

        // ── LOCATOR DEFINITIONS (UI fallback path) ─────────────────────────────
        this.newButton  = () => this.page.locator('button[title="New"]');
        this.saveButton = () => this.page.locator('button[title="Save"]');
        this.field = (name) => this.page.locator(`input[name="${name}"]`);
    }

    accountListUrl() {
        return `${process.env.SF_INSTANCE_URL}/lightning/o/Account/list?filterName=Recent`;
    }

    /** API (default) ya UI se Account banata hai. */
    async createAccount(data = null, useAPI = true) {
        if (useAPI) {
            const accountId = await this.utils.createAccountViaAPI(data);
            this.log.info?.(`Account created via API: ${accountId}`);
            return accountId;
        }

        const acc = data || await this.utils.generateRandomAccountData();
        await this.goto(this.accountListUrl());
        await this.clickWhenVisible(this.newButton());
        for (const f of ['Name', 'Phone', 'BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'BillingCountry']) {
            if (acc[f] != null) await this.field(f).fill(String(acc[f]));
        }
        await this.saveButton().click();
        this.log.info?.(`Account created via UI: ${acc.Name}`);
        return acc.Name;
    }
}

module.exports = { AccountPage };
