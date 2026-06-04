# Live-Org Field Verification

Salesforce CPQ orgs mein API field names aur data vary karte hain. UI suite chalane
se PEHLE ye script tumhare org ke against sab verify kar leta hai — saste API calls,
no UI, ~10 seconds.

## Run
```bash
# .env mein secrets + SF_INSTANCE_URL/SF_LOGIN_URL set hone chahiye
npm run verify:fields
```
Exit code `0` = sab theek (suite chala lo). Exit code `1` = kuch missing (list dikhega).

## Kya check hota hai

**Objects + Fields** (describe API se) —
- Account, Contact, Opportunity
- SBQQ__Quote__c, SBQQ__QuoteLine__c
- Order, Contract
- Pricebook2, PricebookEntry, Product2

Har object ke wo saare fields jo framework read/write karta hai (e.g.
`SBQQ__StartDate__c`, `SBQQ__CustomerDiscount__c`, `SBQQ__Contracted__c`,
`Contract.StartDate`, `Order.Pricebook2Id`, ...).

**Picklist values** —
- `Opportunity.StageName` mein `Prospecting` aur `Closed Won` hone chahiye.

**Data existence** (SOQL se) —
- Pricebook `Standard Price Book` (ya jo `config`/`testData` mein set hai)
- Product `CLOUDSTORAGE` + active bundle ke products (LAPTOP13 + options)
- Un products ke liye us pricebook mein active `PricebookEntry`

## Output example
```
Object: SBQQ__QuoteLine__c
  ✓ SBQQ__Quote__c
  ✗ SBQQ__StartDate__c  — MISSING (check API name in your org)
...
Summary
  ✗ 1 issue(s) found. Fix API names / data above before running the UI suite.
```

## Customising
Agar tumhare org mein koi field ka API name alag hai, do jagah update karo:
1. `tools/verify-fields.js` ke `SCHEMA` map mein (verification ke liye)
2. Actual usage `main/utilities/UtilityFunctions.js` mein (jahan wo field set/query hota hai)
