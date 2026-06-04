// tests/cpq/amendment-flow.spec.js
// Data-driven: cases Excel se aate hain (testdata/cpq-amendment.json, jo
// pretest hook se Excel se banta hai). Har case ek test banta hai -> 100 rows
// = 100 tests, parallel chal jaate hain.
//
// - Login: storageState se reuse (auth.setup.js), yahan dobara login nahi.
// - test.step(): har phase HTML report mein alag dikhta hai.
// - Assertions: Assertions helper se -> report mein pass/fail visible.
// - Logs: per-test logger -> logs/run-*/combined.log.

const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { POManager } = require('../../main/utilities/POManager');
const { UtilityFunctions } = require('../../main/utilities/UtilityFunctions');
const { getLogger } = require('../../utils/logger');

require('dotenv').config();

const dataFile = path.resolve(process.cwd(), 'testdata', 'cpq-amendment.json');
const cases = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : [];

if (cases.length === 0) {
    test('no test data found', () => {
        throw new Error('testdata/cpq-amendment.json missing/empty. Run: npm run data');
    });
}

test.describe('Salesforce CPQ - Amendment Flow (Data-Driven)', () => {

    for (const data of cases) {
        test(data.testCaseName || 'Amendment Flow', async ({ page }) => {
            const log = getLogger(data.testCaseName);
            const utils = new UtilityFunctions(data.testCaseName);
            const poManager = new POManager(page, utils, log);

            const qlePage       = poManager.getQLEPage();
            const orderPage     = poManager.getOrderPage();
            const contractPage  = poManager.getContractPage();
            const amendmentPage = poManager.getAmendmentPage();
            const verify        = poManager.getAssertions();

            const initialQty = Number(data.initialQuantity || 1);
            const amendQty   = Number(data.amendmentQuantity || 7);
            const offsetDays = Number(data.startDateOffsetDays || 35);

            let accountId, contactId, opportunityId, quoteId;
            let orderId, contractId, amendQuoteId, amendedOrderId, amendedContractId;
            let amendmentStartDate;

            await test.step('Setup: create Account, Contact, Opportunity, Quote', async () => {
                accountId     = await poManager.createAccountHybrid(true);
                contactId     = await poManager.createContactHybrid(accountId, true);
                opportunityId = await poManager.createOpportunityHybrid(accountId, true);
                quoteId       = await poManager.createQuoteHybrid(opportunityId, accountId, contactId, true);
                log.info(`Account=${accountId} Contact=${contactId} Opp=${opportunityId} Quote=${quoteId}`);
                verify.verifyRecordCreated(quoteId, 'Quote');
            });

            await test.step('Original quote: pricebook + add product via QLE', async () => {
                await utils.setPricebookOnQuote(quoteId);
                await qlePage.openQuoteRecord(quoteId);
                await qlePage.clickEditLines();
                await qlePage.clickAddProducts();
                await qlePage.selectProduct();
                await qlePage.clickCalculate();
                await qlePage.saveQuoteLines();
            });

            await test.step(`Original quote: set quantity=${initialQty} + discount`, async () => {
                await utils.setQuantityOnQuoteLine(quoteId, initialQty);
                await utils.setDiscountOnQuote(quoteId, Number(data.discount || 18));
            });

            await test.step('Close Opp -> Order -> Activate -> Contract', async () => {
                await utils.closeOpportunityAsWon(opportunityId);
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
            });

            await test.step('Open Contract -> start Amendment', async () => {
                await page.waitForTimeout(8000);
                await contractPage.openContractRecord(contractId);
                await amendmentPage.startAmendment(contractPage);
                amendQuoteId = await amendmentPage.getAmendmentQuoteId(accountId, quoteId);
                verify.verifyRecordCreated(amendQuoteId, 'Amendment Quote');
            });

            await test.step(`Amendment: set quantity=${amendQty} + start date (+${offsetDays}d)`, async () => {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() + offsetDays);
                amendmentStartDate = startDate.toISOString().split('T')[0];

                await page.waitForTimeout(5000);
                await utils.updateAmendmentQuoteLineQuantityAndStartDate(amendQuoteId, amendQty, amendmentStartDate);
                await qlePage.clickCalculate();
                await page.waitForURL('**/lightning/r/SBQQ__Quote__c/*/view*', { timeout: 60000 });
            });

            await test.step('ASSERT: amendment quote line qty + start date', async () => {
                await verify.verifyAmendmentQuoteLine(amendQuoteId, amendQty, amendmentStartDate);
            });

            await test.step('Order the amendment -> activate', async () => {
                amendedOrderId = await utils.prepareAmendmentForOrdering(amendQuoteId, amendmentStartDate);
                verify.verifyRecordCreated(amendedOrderId, 'Amended Order');
                await utils.activateOrder(amendedOrderId);
            });

            await test.step('Contracted=true -> new Contract + patch StartDate', async () => {
                amendedContractId = await utils.createContractFromOrder(amendedOrderId);
                if (!amendedContractId) {
                    for (let i = 1; i <= 6 && !amendedContractId; i++) {
                        await page.waitForTimeout(5000);
                        const res = await utils.apiRequest('get',
                            `query?q=SELECT+Id+FROM+Contract+WHERE+SBQQ__Order__c='${amendedOrderId}'+ORDER+BY+CreatedDate+DESC+LIMIT+1`);
                        if (res.records?.length) amendedContractId = res.records[0].Id;
                        else log.info(`Waiting for Amended Contract... ${i}/6`);
                    }
                }
                verify.verifyRecordCreated(amendedContractId, 'Amended Contract');
                await utils.apiRequest('patch', `sobjects/Contract/${amendedContractId}`, { StartDate: amendmentStartDate });
            });

            await test.step('ASSERT: amended contract start date', async () => {
                await verify.verifyContractStartDate(amendedContractId, amendmentStartDate);
                log.info('Amendment flow completed & verified');
            });
        });
    }
});
