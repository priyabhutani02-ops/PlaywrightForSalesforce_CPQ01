// main/pageObjects/OpportunityPage.js
const { BasePage } = require('./BasePage');

class OpportunityPage extends BasePage {
    constructor(page, utils, logger = console) {
        super(page, logger);
        this.utils = utils;

        // ── LOCATOR DEFINITIONS (UI fallback path) ─────────────────────────────
        this.newButton  = () => this.page.locator('button[title="New"]');
        this.saveButton = () => this.page.locator('button[title="Save"]');
        this.field = (name) => this.page.locator(`input[name="${name}"]`);
        this.stageSelect = () => this.page.locator('select[name="StageName"]');
    }

    oppListUrl() {
        return `${process.env.SF_INSTANCE_URL}/lightning/o/Opportunity/list?filterName=Recent`;
    }

    async createOpportunity(data = null, useAPI = true, accountId = null) {
        if (useAPI) {
            if (!accountId) throw new Error('❌ accountId is mandatory for Opportunity API creation');
            const oppId = await this.utils.createOpportunityViaAPI(accountId, data);
            this.log.info?.(`Opportunity created via API: ${oppId}`);
            return oppId;
        }

        const opp = data || await this.utils.generateRandomOpportunityData();
        await this.goto(this.oppListUrl());
        await this.clickWhenVisible(this.newButton());
        await this.field('Name').fill(opp.Name);
        await this.stageSelect().selectOption(opp.StageName);
        await this.field('CloseDate').fill(opp.CloseDate);
        if (opp.Amount != null) await this.field('Amount').fill(String(opp.Amount));
        await this.saveButton().click();
        this.log.info?.(`Opportunity created via UI: ${opp.Name}`);
        return opp.Name;
    }
}

module.exports = { OpportunityPage };
