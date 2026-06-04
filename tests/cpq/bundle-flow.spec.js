// tests/cpq/bundle-flow.spec.js
// Data-driven Bundle flow. Cases: testdata/cpq-bundle.json (bundleCode pick karta hai).
// Bundle ki options testData.bundles[bundleCode] mein defined hain.

const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { POManager } = require('../../main/utilities/POManager');
const { UtilityFunctions } = require('../../main/utilities/UtilityFunctions');
const testData = require('../../main/utilities/testData');
const { getLogger } = require('../../utils/logger');

require('dotenv').config();

const dataFile = path.resolve(process.cwd(), 'testdata', 'cpq-bundle.json');
const cases = fs.existsSync(dataFile) ? JSON.parse(fs.readFileSync(dataFile, 'utf8')) : [];

if (cases.length === 0) {
    test('no bundle test data found', () => {
        throw new Error('testdata/cpq-bundle.json missing/empty. Run: npm run data');
    });
}

test.describe('Salesforce CPQ - Bundle Flow (Data-Driven)', () => {

    for (const data of cases) {
        test(data.testCaseName || 'Bundle Flow', async ({ page }) => {
            const log = getLogger(data.testCaseName);
            const utils = new UtilityFunctions(data.testCaseName);
            const poManager = new POManager(page, utils, log);

            const qlePage    = poManager.getQLEPage();
            const bundlePage = poManager.getBundlePage();
            const verify     = poManager.getAssertions();

            const bundle = testData.bundles[data.bundleCode];
            if (!bundle) throw new Error(`Unknown bundleCode in data: ${data.bundleCode}`);

            let accountId, contactId, opportunityId, quoteId;

            await test.step('Setup: Account, Contact, Opportunity, Quote', async () => {
                accountId     = await poManager.createAccountHybrid(true);
                contactId     = await poManager.createContactHybrid(accountId, true);
                opportunityId = await poManager.createOpportunityHybrid(accountId, true);
                quoteId       = await poManager.createQuoteHybrid(opportunityId, accountId, contactId, true);
                log.info(`Account=${accountId} Quote=${quoteId} Bundle=${data.bundleCode}`);
                verify.verifyRecordCreated(quoteId, 'Quote');
            });

            await test.step(`Configure bundle ${data.bundleCode} via QLE`, async () => {
                await utils.setPricebookOnQuote(quoteId);
                await qlePage.openQuoteRecord(quoteId);
                await qlePage.clickEditLines();
                await qlePage.handlePricebookDialog();
                await qlePage.clickAddProductsWithSearch(bundle.productCode);
                await qlePage.selectProduct(bundle.productCode);
                await page.waitForTimeout(3000);
                await bundlePage.configureBundleOptions(bundle.options);
                await bundlePage.saveBundleConfig();
                await qlePage.clickCalculate();
                await qlePage.saveQuoteLines();
            });

            await test.step('ASSERT: bundle produced multiple quote lines', async () => {
                // parent + at least one option => >= 2 lines
                await verify.verifyQuoteLineCount(quoteId, 2);
                log.info('Bundle flow completed & verified');
            });
        });
    }
});
