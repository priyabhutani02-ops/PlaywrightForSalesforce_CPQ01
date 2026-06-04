// config/generate-config.js
// Non-secret settings ka Excel banata hai. Run: node config/generate-config.js
// NOTE: Yahan SIRF non-sensitive config rakho. Secrets (CLIENT_ID, USERNAME,
// PRIVATE_KEY_PATH) HAMESHA .env mein rahenge — Excel mein kabhi nahi.

const path = require('path');
const ExcelJS = require('exceljs');

async function main() {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Settings');
    sheet.columns = [
        { header: 'key', key: 'key', width: 24 },
        { header: 'value', key: 'value', width: 42 },
        { header: 'description', key: 'description', width: 50 }
    ];

    const rows = [
        { key: 'SF_INSTANCE_URL', value: 'https://your-domain.my.salesforce.com', description: 'Salesforce Lightning base URL' },
        { key: 'SF_LOGIN_URL',    value: 'https://login.salesforce.com',          description: 'OAuth token endpoint host' },
        { key: 'PRICEBOOK_NAME',  value: 'Standard Price Book',                   description: 'Pricebook used in tests' },
        { key: 'DATA_FILE',       value: './testdata/cpq-amendment.xlsx',         description: 'Test-data spreadsheet path' },
        { key: 'HEADLESS',        value: 'true',                                  description: 'true=invisible (bulk), false=demo' },
        { key: 'SLOWMO',          value: '0',                                     description: 'ms delay per action (demo: 600)' },
        { key: 'WORKERS',         value: '4',                                     description: 'parallel workers for bulk runs' },
        { key: 'RETRIES',         value: '1',                                     description: 'retries on failure' },
        { key: 'VIDEO',           value: 'off',                                   description: 'on = always record video' },
        { key: 'LOG_LEVEL',       value: 'info',                                  description: 'info / debug / warn / error' }
    ];
    rows.forEach((r) => sheet.addRow(r));
    sheet.getRow(1).font = { bold: true };

    const out = path.resolve(__dirname, 'settings.xlsx');
    await wb.xlsx.writeFile(out);
    console.log(`✅ Config written → ${out}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
