// config/config-to-json.js
// settings.xlsx (Settings sheet, key/value) -> config/settings.json (sync-readable).
// pretest hook se auto chalega. playwright.config.js isi JSON ko padhta hai.

const fs = require('fs');
const path = require('path');
const { ExcelReader } = require('../utils/ExcelReader');

async function main() {
    const file = path.resolve(__dirname, 'settings.xlsx');
    if (!fs.existsSync(file)) {
        console.log('ℹ️  config/settings.xlsx not found — skipping (using .env only)');
        return;
    }

    const reader = new ExcelReader(file);
    const rows = await reader.getRows('Settings'); // [{key, value, description}, ...]

    const cfg = {};
    for (const r of rows) {
        if (r.key) cfg[String(r.key).trim()] = r.value;
    }

    const out = path.resolve(__dirname, 'settings.json');
    fs.writeFileSync(out, JSON.stringify(cfg, null, 2));
    console.log(`✅ ${Object.keys(cfg).length} setting(s) → ${out}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
