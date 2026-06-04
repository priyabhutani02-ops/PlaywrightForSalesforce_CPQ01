// config/loadConfig.js
// Settings ko process.env mein load karta hai. Precedence (high -> low):
//   1. Real shell env var (CI injection)   <- jeet-ta hai
//   2. .env file (secrets)
//   3. config/settings.json (Excel se generated)
// Matlab: jo pehle se set hai use Excel override NAHI karta.
// Secrets sirf .env mein hone chahiye — Excel mein kabhi nahi.

const fs = require('fs');
const path = require('path');

function loadConfig() {
    // 1 + 2: .env load (dotenv real shell env ko override nahi karta)
    require('dotenv').config();

    // 3: Excel-generated JSON se baaki settings bharo (sirf agar already set nahi)
    const jsonPath = path.resolve(process.cwd(), 'config', 'settings.json');
    if (fs.existsSync(jsonPath)) {
        const cfg = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        for (const [k, v] of Object.entries(cfg)) {
            if (process.env[k] === undefined || process.env[k] === '') {
                process.env[k] = String(v);
            }
        }
    }
}

module.exports = { loadConfig };
