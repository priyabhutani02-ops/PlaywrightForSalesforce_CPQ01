// main/utilities/Assertions.js
// Reusable assertions jo Salesforce ki ACTUAL state ko API se verify karti hain.
// expect() use hota hai -> ye Playwright HTML report mein step ke andar dikhega
// (pass/fail dono). Har assert ek descriptive message ke saath.

const { expect } = require('@playwright/test');

class Assertions {
    /**
     * @param {import('./UtilityFunctions').UtilityFunctions} utils
     * @param {object} [logger]
     */
    constructor(utils, logger = console) {
        this.utils = utils;
        this.log = logger;
    }

    /** Quote line ki quantity + start date verify. */
    async verifyAmendmentQuoteLine(quoteId, expectedQty, expectedStartDate) {
        const res = await this.utils.apiRequest(
            'get',
            `query?q=${encodeURIComponent(
                `SELECT Id, SBQQ__Quantity__c, SBQQ__StartDate__c FROM SBQQ__QuoteLine__c WHERE SBQQ__Quote__c = '${quoteId}' LIMIT 1`
            )}`
        );

        expect(res.records?.length, 'Amendment quote line should exist').toBeGreaterThan(0);
        const line = res.records[0];

        expect(Number(line.SBQQ__Quantity__c), 'Amended quantity should match expected').toBe(Number(expectedQty));
        expect(line.SBQQ__StartDate__c, 'Amended start date should match expected').toBe(expectedStartDate);

        this.log.info?.(`Verified quote line → qty=${line.SBQQ__Quantity__c}, start=${line.SBQQ__StartDate__c}`);
        return line;
    }

    /** Record ki existence (Order/Contract/etc.) verify. */
    verifyRecordCreated(recordId, label = 'Record') {
        expect(recordId, `${label} should be created`).toBeTruthy();
        expect(String(recordId), `${label} Id should be a valid 15/18-char SF Id`).toMatch(/^[a-zA-Z0-9]{15,18}$/);
        this.log.info?.(`Verified ${label} created → ${recordId}`);
    }

    /** Contract ki StartDate verify. */
    async verifyContractStartDate(contractId, expectedStartDate) {
        const res = await this.utils.apiRequest(
            'get',
            `query?q=${encodeURIComponent(
                `SELECT Id, StartDate, Status FROM Contract WHERE Id = '${contractId}' LIMIT 1`
            )}`
        );

        expect(res.records?.length, 'Amended contract should exist').toBeGreaterThan(0);
        const contract = res.records[0];
        expect(contract.StartDate, 'Contract start date should match amendment start date').toBe(expectedStartDate);

        this.log.info?.(`Verified contract → start=${contract.StartDate}, status=${contract.Status}`);
        return contract;
    }

    /** Contact sahi Account se linked hai? */
    async verifyContactLinkedToAccount(contactId, accountId) {
        const c = await this.utils.apiRequest('get', `sobjects/Contact/${contactId}?fields=Id,AccountId`);
        expect(c.AccountId, 'Contact should be linked to the Account').toBe(accountId);
        this.log.info?.(`Verified Contact ${contactId} linked to Account ${accountId}`);
    }

    /** Opportunity ka stage expected ke barabar hai? */
    async verifyOpportunityStage(opportunityId, expectedStage) {
        const o = await this.utils.apiRequest('get', `sobjects/Opportunity/${opportunityId}?fields=Id,StageName`);
        expect(o.StageName, `Opportunity stage should be "${expectedStage}"`).toBe(expectedStage);
        this.log.info?.(`Verified Opportunity stage → ${o.StageName}`);
    }

    /** Quote pe kitni lines bani (bundle => parent + child lines > 1). */
    async verifyQuoteLineCount(quoteId, minExpected = 1) {
        const res = await this.utils.apiRequest(
            'get',
            `query?q=${encodeURIComponent(`SELECT Id FROM SBQQ__QuoteLine__c WHERE SBQQ__Quote__c = '${quoteId}'`)}`
        );
        const count = res.records?.length || 0;
        expect(count, `Quote should have at least ${minExpected} line(s)`).toBeGreaterThanOrEqual(minExpected);
        this.log.info?.(`Verified quote line count → ${count}`);
        return count;
    }
}

module.exports = { Assertions };
