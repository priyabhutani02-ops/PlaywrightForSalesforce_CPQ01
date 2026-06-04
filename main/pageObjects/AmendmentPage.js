// main/pageObjects/AmendmentPage.js
const { BasePage } = require('./BasePage');

class AmendmentPage extends BasePage {
    constructor(page, utils, logger = console) {
        super(page, logger);
        this.utils = utils;
    }

    async startAmendment(contractPage) {
        await contractPage.clickAmend();
        await contractPage.clickSecondAmend();
    }

    /**
     * Amendment ke baad naya Quote banta hai. Original quote ko exclude karke
     * latest quote dhoondte hain (polling, kyunki SF async hai).
     */
    async getAmendmentQuoteId(accountId, originalQuoteId, { retries = 20, waitMs = 3000 } = {}) {
        const query = `
            SELECT Id, Name, CreatedDate, SBQQ__Primary__c, SBQQ__Account__c
            FROM SBQQ__Quote__c
            WHERE SBQQ__Account__c = '${accountId}'
            AND Id != '${originalQuoteId}'
            ORDER BY CreatedDate DESC
            LIMIT 1
        `;

        for (let i = 1; i <= retries; i++) {
            const result = await this.utils.apiRequest('get', `query?q=${encodeURIComponent(query)}`);
            if (result.records?.length > 0) {
                const quoteId = result.records[0].Id;
                this.log.info?.(`Amendment Quote found → ${quoteId}`);
                return quoteId;
            }
            this.log.info?.(`Waiting for Amendment Quote... attempt ${i}/${retries}`);
            await new Promise((r) => setTimeout(r, waitMs));
        }
        throw new Error('❌ Amendment Quote not found after retries');
    }
}

module.exports = { AmendmentPage };
