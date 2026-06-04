// main/pageObjects/QuotePage.js
const { BasePage } = require('./BasePage');

class QuotePage extends BasePage {
    constructor(page, utils, logger = console) {
        super(page, logger);
        this.utils = utils;
    }

    async createQuote(opportunityId, accountId, contactId = null) {
        if (!opportunityId || !accountId) throw new Error('❌ opportunityId & accountId required');
        const quoteId = await this.utils.createQuoteViaAPI(opportunityId, accountId, contactId);
        this.log.info?.(`Quote created via API: ${quoteId}`);
        return quoteId;
    }
}

module.exports = { QuotePage };
