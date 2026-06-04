# Salesforce CPQ — Playwright Test Automation

End-to-end automation for Salesforce CPQ: **Quote → Order → Contract → Amendment**, plus **Bundle** and **Approval** flows. Hybrid API + UI, data-driven from Excel, parallel-ready, with assertions, HTML reporting and per-run logs.

## Quick start
```bash
npm install
npx playwright install chromium
cp .env.example .env          # fill SECRETS only (client id, username, key path)
npm run config                # generate config/settings.xlsx (edit non-secret settings here)
npm run data                  # generate sample test-data spreadsheets
npm test                      # run all, headless & parallel
npm run report                # open the HTML report
```

## Project structure
```
config/            non-secret settings in Excel -> loaded into env
  settings.xlsx        edit here (HEADLESS, WORKERS, URLs, pricebook...)
  loadConfig.js        precedence: shell env > .env > Excel
testdata/          test cases in Excel (one row = one test)
  cpq-amendment.xlsx   AmendmentCases
  cpq-quote.xlsx       QuoteCases (with & without approval)
  cpq-bundle.xlsx      BundleCases
utils/
  logger.js            winston -> logs/run-<timestamp>/
  ExcelReader.js       reads .xlsx rows
main/
  pageObjects/         one module per Salesforce screen (extend BasePage)
    BasePage, Login, Account, Contact, Opportunity, Quote,
    QLE, Order, Contract, Amendment, Bundle
  utilities/
    POManager.js        single entry point to all pages + assertions
    UtilityFunctions.js Salesforce REST API helpers (JWT auth)
    Assertions.js       verifies real SF state (used in test.step)
    testData.js         static fixtures (bundle definitions, defaults)
tests/
  auth.setup.js        logs in ONCE -> storageState (reused by all tests)
  cpq/
    amendment-flow.spec.js
    quote-flow.spec.js     (approval + no-approval via data column)
    bundle-flow.spec.js
playwright.config.js   parallel, env-driven, setup+chromium projects, reporters
```

## How it runs
1. `setup` project logs in once and saves the session.
2. Every test reuses that session (no repeated logins).
3. Each spec reads its Excel-derived JSON and creates one test per enabled row.
4. Assertions inside `test.step()` verify Salesforce data — visible in the HTML report.

## Scaling to 100+ tests
Add rows to the relevant `testdata/*.xlsx` (set `run=TRUE`), then:
```bash
npm run data
HEADLESS=true WORKERS=8 npm test
```

## Commands
| Command | Purpose |
|---|---|
| `npm test` | all tests, headless, parallel |
| `npm run test:headed` | visible browser (demo) |
| `npm run test:amendment` | amendment flow only |
| `npm run test:parallel` | 8 workers |
| `npm run report` | open HTML report |
| `npm run data` | regenerate test-data spreadsheets + JSON |
| `npm run config` | regenerate settings spreadsheet + JSON |

## Security
Secrets (`SF_CLIENT_ID`, `SF_USERNAME`, `PRIVATE_KEY_PATH`) live ONLY in `.env` (gitignored). Non-secret settings live in `config/settings.xlsx`. Never put credentials in any spreadsheet.

See `FRAMEWORK_NOTES.md` for the review-points mapping and bug fixes.
