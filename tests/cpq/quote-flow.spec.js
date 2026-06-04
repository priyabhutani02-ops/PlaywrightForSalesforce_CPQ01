// tests/cpq/quote-flow.spec.js
// Data-driven Quote flow — with & without approval (requiresApproval column se decide).
// Cases: testdata/cpq-quote.json (Excel se generated). Login: storageState se reuse.

const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { POManager } = require('../../main/utilities/POManager');
const { UtilityFunctions } = require('../../main/utilities/UtilityFunctions');
const { getLogger } = require('../../utils/logger');

require('dotenv').config();

const dataFile = path.resolve(process.cwd(), 'testdata', 'cpq-quote.json');
const cases = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : [];

const truthy = (v) => ['true', 'yes', '1', 'y'].includes(String(v).trim().toLowerCase());

if (cases.length === 0) {
    test('no quote test data found', () => {
        throw new Error('testdata/cpq-quote.json missing/empty. Run: npm run data');
    });
}

test.describe('Salesforce CPQ - Quote Flow (Data-Driven)', () => {

    for (const data of cases) {
        test(data.testCaseName || 'Quote Flow', async ({ page }) => {
            const log = getLogger(data.testCaseName);
            const utils = new UtilityFunctions(data.testCaseName);
            const poManager = new POManager(page, utils, log);

            const qlePage      = poManager.getQLEPage();
            const orderPage    = poManager.getOrderPage();
            const contractPage = poManager.getContractPage();
            const verify       = poManager.getAssertions();

            const productCode = data.productCode || undefined;
            const quantity    = Number(data.quantity || 1);
            const discount    = Number(data.discount || 18);
            const needsApproval = truthy(data.requiresApproval);

            let accountId, contactId, opportunityId, quoteId, orderId, contractId;

            await test.step('Setup: Account, Contact, Opportunity, Quote', async () => {
                accountId     = await poManager.createAccountHybrid(true);
                contactId     = await poManager.createContactHybrid(accountId, true);
                opportunityId = await poManager.createOpportunityHybrid(accountId, true);
                quoteId       = await poManager.createQuoteHybrid(opportunityId, accountId, contactId, true);
                log.info(`Account=${accountId} Contact=${contactId} Opp=${opportunityId} Quote=${quoteId}`);
                verify.verifyRecordCreated(quoteId, 'Quote');
                await verify.verifyContactLinkedToAccount(contactId, accountId);
            });

            await test.step('Add product via QLE + pricebook', async () => {
                await utils.setPricebookOnQuote(quoteId);
                await qlePage.openQuoteRecord(quoteId);
                await qlePage.clickEditLines();
                await qlePage.handlePricebookDialog();
                await qlePage.clickAddProducts(productCode);
                await qlePage.selectProduct(productCode);
                await qlePage.clickCalculate();
                await qlePage.saveQuoteLines();
                await utils.setQuantityOnQuoteLine(quoteId, quantity);
            });

            await test.step('ASSERT: quote has at least one line', async () => {
                await verify.verifyQuoteLineCount(quoteId, 1);
            });

            await test.step(`Set discount=${discount}%`, async () => {
                await utils.setDiscountOnQuote(quoteId, discount);
            });

            if (needsApproval) {
                await test.step('Submit for approval -> approve', async () => {
                    await utils.submitQuoteForApproval(quoteId);
                    const workitemId = await utils.getApprovalWorkitemId(quoteId);
                    verify.verifyRecordCreated(workitemId, 'Approval Workitem');
                    await utils.approveQuote(workitemId);
                });
            }

            await test.step('Close-Won -> Order -> Activate -> Contract', async () => {
                await utils.closeOpportunityAsWon(opportunityId);
                await verify.verifyOpportunityStage(opportunityId, 'Closed Won');

                orderId = await orderPage.createOrderFromQuote(quoteId);
                verify.verifyRecordCreated(orderId, 'Order');
                await orderPage.activateOrder(orderId);

                contractId = await contractPage.createContractFromOrder(orderId);
                if (!contractId) {
                    for (let i = 1; i <= 6 && !contractId; i++) {
                        await page.waitForTimeout(5000);
                        const res = await utils.apiRequest('get',
                            `query?q=SELECT+Id+FROM+Contract+WHERE+SBQQ__Order__c='${orderId}'+ORDER+BY+CreatedDate+DESC+LIMIT+1`);
                        if (res.records?.length) contractId = res.records[0].Id;
                        else log.info(`Waiting for Contract... ${i}/6`);
                    }
                }
                verify.verifyRecordCreated(contractId, 'Contract');
                log.info('Quote flow completed & verified');
            });
        });
    }
});
