// tools/verify-fields.js
// LIVE-ORG VERIFICATION — UI suite chalane se PEHLE chalao.
// Tumhare org mein login karke check karta hai ki framework jo objects,
// fields, picklist values aur data (pricebook/product/PBE) use karta hai,
// wo actually exist karte hain. Kuch missing hua to clear list + non-zero exit.
//
// Run:  node tools/verify-fields.js     (ya: npm run verify:fields)

const { loadConfig } = require('../config/loadConfig');
const { UtilityFunctions } = require('../main/utilities/UtilityFunctions');
const testData = require('../main/utilities/testData');

loadConfig();

// ── Objects + fields the framework reads/writes ─────────────────────────────
const SCHEMA = {
    Account: ['Name', 'Phone', 'BillingStreet', 'BillingCity', 'BillingState', 'BillingPostalCode', 'BillingCountry',
              'ShippingStreet', 'ShippingCity', 'ShippingState', 'ShippingPostalCode', 'ShippingCountry'],
    Contact: ['Salutation', 'LastName', 'Email', 'Phone', 'MailingStreet', 'MailingCity', 'MailingState',
              'MailingPostalCode', 'MailingCountry', 'AccountId'],
    Opportunity: ['Name', 'StageName', 'CloseDate', 'AccountId', 'Amount'],
    SBQQ__Quote__c: ['SBQQ__Opportunity2__c', 'SBQQ__Account__c', 'SBQQ__Primary__c', 'SBQQ__SubscriptionTerm__c',
                     'SBQQ__StartDate__c', 'SBQQ__EndDate__c', 'SBQQ__PrimaryContact__c', 'SBQQ__PricebookId__c',
                     'SBQQ__CustomerDiscount__c', 'SBQQ__Ordered__c'],
    SBQQ__QuoteLine__c: ['SBQQ__Quote__c', 'SBQQ__Quantity__c', 'SBQQ__StartDate__c', 'SBQQ__Product__c', 'SBQQ__PricebookEntryId__c'],
    Order: ['SBQQ__Quote__c', 'OrderNumber', 'Status', 'SBQQ__Contracted__c', 'Pricebook2Id', 'EffectiveDate'],
    Contract: ['SBQQ__Order__c', 'ContractNumber', 'StartDate', 'Status'],
    Pricebook2: ['Name'],
    PricebookEntry: ['Product2Id', 'Pricebook2Id', 'IsActive'],
    Product2: ['ProductCode', 'Name']
};

// ── Picklist values the framework relies on ─────────────────────────────────
const PICKLISTS = {
    Opportunity: { StageName: [testData.opportunity.stage, 'Closed Won'] }
};

const c = { ok: (s) => `  \x1b[32m✓\x1b[0m ${s}`, bad: (s) => `  \x1b[31m✗\x1b[0m ${s}`, head: (s) => `\n\x1b[1m${s}\x1b[0m`, dim: (s) => `\x1b[2m${s}\x1b[0m` };

(async () => {
    let failures = 0;
    const utils = new UtilityFunctions('VERIFY');

    console.log(c.head('Salesforce CPQ — Live Org Verification'));
    console.log(c.dim(`  Org: ${process.env.SF_INSTANCE_URL || '(SF_INSTANCE_URL not set)'}`));

    // 1) Authenticate
    try {
        await utils.getAccessToken();
        console.log(c.ok('Authenticated (JWT) successfully'));
    } catch (e) {
        console.log(c.bad(`Authentication failed: ${e.message}`));
        console.log(c.dim('  Check .env: SF_CLIENT_ID, SF_USERNAME, PRIVATE_KEY_PATH, SF_LOGIN_URL, SF_INSTANCE_URL'));
        process.exit(2);
    }

    // 2) Objects + fields
    for (const [obj, fields] of Object.entries(SCHEMA)) {
        console.log(c.head(`Object: ${obj}`));
        let desc;
        try {
            desc = await utils.apiRequest('get', `sobjects/${obj}/describe`);
        } catch (e) {
            console.log(c.bad(`Object not found / not accessible (${e.response?.status || e.message})`));
            failures += fields.length + 1;
            continue;
        }
        const present = new Set((desc.fields || []).map((f) => f.name.toLowerCase()));

        for (const field of fields) {
            if (present.has(field.toLowerCase())) {
                console.log(c.ok(field));
            } else {
                console.log(c.bad(`${field}  — MISSING (check API name in your org)`));
                failures++;
            }
        }

        // picklist values for this object
        const pl = PICKLISTS[obj];
        if (pl) {
            for (const [plField, values] of Object.entries(pl)) {
                const fieldMeta = (desc.fields || []).find((f) => f.name.toLowerCase() === plField.toLowerCase());
                const available = new Set((fieldMeta?.picklistValues || []).filter((v) => v.active).map((v) => v.value.toLowerCase()));
                for (const v of values) {
                    if (available.has(String(v).toLowerCase())) console.log(c.ok(`${plField} value "${v}"`));
                    else { console.log(c.bad(`${plField} value "${v}" — MISSING from picklist`)); failures++; }
                }
            }
        }
    }

    // 3) Data existence checks (pricebook / product / pricebook entry)
    console.log(c.head('Data: Pricebook / Product / PricebookEntry'));
    const q = async (soql) => (await utils.apiRequest('get', `query?q=${encodeURIComponent(soql)}`)).records || [];

    try {
        const pbName = testData.pricebook.name;
        const pb = await q(`SELECT Id FROM Pricebook2 WHERE Name = '${pbName}' LIMIT 1`);
        if (pb.length) console.log(c.ok(`Pricebook "${pbName}" exists`));
        else { console.log(c.bad(`Pricebook "${pbName}" NOT found`)); failures++; }

        // collect product codes used: simple product + active bundle (parent + options)
        const codes = new Set([testData.product.code]);
        const activeBundle = testData.bundles[testData.activeBundleCode];
        if (activeBundle) {
            codes.add(activeBundle.productCode);
            (activeBundle.options || []).forEach((o) => codes.add(o.productCode));
        }

        for (const code of codes) {
            const prod = await q(`SELECT Id FROM Product2 WHERE ProductCode = '${code}' AND IsActive = true LIMIT 1`);
            if (!prod.length) { console.log(c.bad(`Product "${code}" NOT found (active)`)); failures++; continue; }
            console.log(c.ok(`Product "${code}" exists`));

            if (pb.length) {
                const pbe = await q(`SELECT Id FROM PricebookEntry WHERE Product2Id = '${prod[0].Id}' AND Pricebook2Id = '${pb[0].Id}' AND IsActive = true LIMIT 1`);
                if (pbe.length) console.log(c.ok(`  PricebookEntry for "${code}" in "${pbName}"`));
                else { console.log(c.bad(`  PricebookEntry for "${code}" in "${pbName}" NOT found`)); failures++; }
            }
        }
    } catch (e) {
        console.log(c.bad(`Data check error: ${e.response?.data?.[0]?.message || e.message}`));
        failures++;
    }

    // 4) Summary
    console.log(c.head('Summary'));
    if (failures === 0) {
        console.log(c.ok('All objects, fields, picklist values and data verified. Safe to run the suite.'));
        process.exit(0);
    } else {
        console.log(c.bad(`${failures} issue(s) found. Fix API names / data above before running the UI suite.`));
        process.exit(1);
    }
})();
