# CPQ Framework Upgrade — Review Points Mapping

| # | Review point | Kaise address hua | Files |
|---|---|---|---|
| 1 | Assertions nahi hai | `Assertions` helper + `expect()` har critical step pe (qty, start date, record creation) | `main/utilities/Assertions.js`, spec |
| 2 | Data Excel se aaye | `ExcelReader` (exceljs) + Excel→JSON cache, data-driven loop. `run` column se case on/off | `utils/ExcelReader.js`, `testdata/*.js`, `cpq-amendment.xlsx` |
| 3 | Login baar-baar ho raha | `auth.setup.js` ek baar login → `storageState` save → sab tests reuse | `tests/auth.setup.js`, `playwright.config.js` |
| 4 | Reusable components utils mein | `BasePage` (common actions), `Assertions`, `ExcelReader`, `logger` | `main/pageObjects/BasePage.js`, `utils/*` |
| 5 | 100 tests ek saath chale | `fullyParallel:true`, `WORKERS` env, headless default, data rows scale | `playwright.config.js` |
| 6 | HTML reporting proper | HTML + JSON + JUnit reporters | `playwright.config.js` |
| 7 | Logs separate folder, runtime | winston → `logs/run-<timestamp>/combined.log + error.log` | `utils/logger.js` |
| 8 | Test results show ho | HTML report + `npm run report`, JUnit for CI | `playwright.config.js` |
| 9 | Assertions report mein dikhe | `test.step()` + `expect()` → har step/assert HTML report mein pass/fail | spec, `Assertions.js` |
| 10 | Page objects mein definitions | Locator definitions getters mein, `BasePage` extend | `BasePage`, `ContractPage`, `AmendmentPage` |

## Config in Excel (non-secret settings)
- `config/settings.xlsx` (Settings sheet, key/value) holds non-secret config:
  `SF_INSTANCE_URL`, `SF_LOGIN_URL`, `PRICEBOOK_NAME`, `DATA_FILE`, `HEADLESS`,
  `SLOWMO`, `WORKERS`, `RETRIES`, `VIDEO`, `LOG_LEVEL`.
- **Secrets stay in `.env`** (`SF_CLIENT_ID`, `SF_USERNAME`, `PRIVATE_KEY_PATH`) — NEVER in Excel.
- Precedence (high→low): real shell env (CI) > `.env` > Excel settings.
- `npm run config` regenerates the Excel + JSON cache. Loaded by `config/loadConfig.js`.

## Bugs fixed
- `testData.js`: duplicate `code`/`quantity` keys hata diye.
- `POManager.createContactHybrid`: signature `(accountId, useAPI)` — `true` galti se `data` mein ja raha tha.
- `LoginPage`: env var `SALESFORCE_INSTANCE` → `SF_INSTANCE_URL` (consistency).

## Setup & run
```bash
npm install
npx playwright install chromium
cp .env.example .env        # apni SF creds bharo
npm run data                # Excel + JSON generate (sample)
npm test                    # headless parallel
npm run test:headed         # demo (visible browser)
npm run report              # HTML report kholo
```

## Scale to 100 tests
`testdata/cpq-amendment.xlsx` mein rows add karo (`run=TRUE`), `npm run data`, `npm test`.

## Baaki page objects (10) — same pattern apply karna
`QLEPage`, `OrderPage`, `AccountPage`, `OpportunityPage`, `QuotePage`, `ContactPage`, `BundlePage` ko bhi
`BasePage` extend karao + locators ko constructor/getters mein define karo (jaise ContractPage/AmendmentPage).
