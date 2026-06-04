// utils/ExcelReader.js
// Test data ko Excel (.xlsx) se padhta hai. Pehli row = headers,
// baaki rows = data. Har row ek object ban jaati hai { header: value }.
// Sirf wahi rows return hoti hain jinka `run` column TRUE/yes/1 ho
// (taaki Excel se hi tum decide kar sako kaunse cases run karne hain).

const path = require('path');
const ExcelJS = require('exceljs');

class ExcelReader {
    /**
     * @param {string} filePath  .xlsx file ka path (default + override env DATA_FILE)
     */
    constructor(filePath) {
        this.filePath = filePath || process.env.DATA_FILE ||
            path.resolve(process.cwd(), 'testdata', 'cpq-amendment.xlsx');
    }

    /**
     * Sheet ki saari (enabled) rows objects ke array mein.
     * @param {string} sheetName
     * @returns {Promise<Array<Object>>}
     */
    async getRows(sheetName) {
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(this.filePath);

        const sheet = sheetName ? workbook.getWorksheet(sheetName) : workbook.worksheets[0];
        if (!sheet) {
            throw new Error(`❌ Sheet "${sheetName}" not found in ${this.filePath}`);
        }

        const headers = [];
        sheet.getRow(1).eachCell((cell, col) => {
            headers[col] = String(cell.value).trim();
        });

        const rows = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return; // header skip

            const obj = {};
            row.eachCell((cell, col) => {
                const key = headers[col];
                if (key) obj[key] = this._normalise(cell.value);
            });

            // empty row skip
            if (Object.keys(obj).length === 0) return;

            // `run` column se filter
            if ('run' in obj && !this._isTruthy(obj.run)) return;

            rows.push(obj);
        });

        return rows;
    }

    _normalise(value) {
        if (value && typeof value === 'object' && 'result' in value) return value.result; // formula cell
        if (value && typeof value === 'object' && 'text' in value) return value.text;      // rich text
        return value;
    }

    _isTruthy(v) {
        if (typeof v === 'boolean') return v;
        const s = String(v).trim().toLowerCase();
        return s === 'true' || s === 'yes' || s === 'y' || s === '1';
    }
}

module.exports = { ExcelReader };
