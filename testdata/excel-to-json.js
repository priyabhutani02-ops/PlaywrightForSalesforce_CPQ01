// testdata/excel-to-json.js
// Saare flow Excels ko JSON cache mein convert karta hai (specs sync padhte hain).
// pretest hook se auto chalta hai.

const fs = require('fs');
const path = require('path');
const { ExcelReader } = require('../utils/ExcelReader');

const MAP = [
    { file: 'cpq-amendment.xlsx', sheet: 'AmendmentCases', json: 'cpq-amendment.json' },
    { file: 'cpq-quote.xlsx',     sheet: 'QuoteCases',     json: 'cpq-quote.json' },
    { file: 'cpq-bundle.xlsx',    sheet: 'BundleCases',    json: 'cpq-bundle.json' }
];

async function main() {
    for (const m of MAP) {
        const xlsx = path.resolve(__dirname, m.file);
        const out = path.resolve(__dirname, m.json);
        if (!fs.existsSync(xlsx)) {
            fs.writeFileSync(out, '[]');
            console.log(`ℹ️  ${m.file} missing — wrote empty ${m.json}`);
            continue;
        }
        const rows = await new ExcelReader(xlsx).getRows(m.sheet);
        fs.writeFileSync(out, JSON.stringify(rows, null, 2));
        console.log(`✅ ${rows.length} case(s) → ${m.json}`);
    }
}
main().catch((e) => { console.error(e); process.exit(1); });
