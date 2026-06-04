// testdata/generate-testdata.js
// Sab flows ka sample test-data Excel banata hai. Run: node testdata/generate-testdata.js
//   - cpq-amendment.xlsx (AmendmentCases)
//   - cpq-quote.xlsx     (QuoteCases)  -> with & without approval, requiresApproval column se
//   - cpq-bundle.xlsx    (BundleCases) -> bundleCode; options testData.bundles mein
// Rows add/edit karke data-driven tests scale karo (run=TRUE/FALSE se on/off).

const path = require('path');
const ExcelJS = require('exceljs');

async function sheet(file, name, columns, rows) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(name);
    ws.columns = columns;
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true };
    const out = path.resolve(__dirname, file);
    await wb.xlsx.writeFile(out);
    console.log(`✅ ${rows.length} row(s) → ${out}`);
}

async function main() {
    // 1) AMENDMENT
    await sheet('cpq-amendment.xlsx', 'AmendmentCases', [
        { header: 'run', key: 'run', width: 8 },
        { header: 'testCaseName', key: 'testCaseName', width: 32 },
        { header: 'productCode', key: 'productCode', width: 16 },
        { header: 'initialQuantity', key: 'initialQuantity', width: 16 },
        { header: 'amendmentQuantity', key: 'amendmentQuantity', width: 18 },
        { header: 'startDateOffsetDays', key: 'startDateOffsetDays', width: 20 },
        { header: 'discount', key: 'discount', width: 10 },
        { header: 'pricebookName', key: 'pricebookName', width: 22 }
    ], [
        { run: 'TRUE',  testCaseName: 'Amend_IncreaseQty_1to7',  productCode: 'CLOUDSTORAGE', initialQuantity: 1, amendmentQuantity: 7,  startDateOffsetDays: 35, discount: 18, pricebookName: 'Standard Price Book' },
        { run: 'TRUE',  testCaseName: 'Amend_IncreaseQty_2to10', productCode: 'CLOUDSTORAGE', initialQuantity: 2, amendmentQuantity: 10, startDateOffsetDays: 45, discount: 15, pricebookName: 'Standard Price Book' },
        { run: 'FALSE', testCaseName: 'Amend_DecreaseQty_5to3',  productCode: 'CLOUDSTORAGE', initialQuantity: 5, amendmentQuantity: 3,  startDateOffsetDays: 30, discount: 10, pricebookName: 'Standard Price Book' }
    ]);

    // 2) QUOTE (with & without approval)
    await sheet('cpq-quote.xlsx', 'QuoteCases', [
        { header: 'run', key: 'run', width: 8 },
        { header: 'testCaseName', key: 'testCaseName', width: 34 },
        { header: 'productCode', key: 'productCode', width: 16 },
        { header: 'quantity', key: 'quantity', width: 10 },
        { header: 'discount', key: 'discount', width: 10 },
        { header: 'requiresApproval', key: 'requiresApproval', width: 16 }
    ], [
        { run: 'TRUE', testCaseName: 'Quote_NoApproval_Discount18', productCode: 'CLOUDSTORAGE', quantity: 1, discount: 18, requiresApproval: 'FALSE' },
        { run: 'TRUE', testCaseName: 'Quote_Approval_Discount20',   productCode: 'CLOUDSTORAGE', quantity: 1, discount: 20, requiresApproval: 'TRUE'  }
    ]);

    // 3) BUNDLE (options testData.bundles mein defined)
    await sheet('cpq-bundle.xlsx', 'BundleCases', [
        { header: 'run', key: 'run', width: 8 },
        { header: 'testCaseName', key: 'testCaseName', width: 30 },
        { header: 'bundleCode', key: 'bundleCode', width: 16 }
    ], [
        { run: 'TRUE',  testCaseName: 'Bundle_Laptop13', bundleCode: 'LAPTOP13' },
        { run: 'FALSE', testCaseName: 'Bundle_Laptop15', bundleCode: 'LAPTOP15' },
        { run: 'FALSE', testCaseName: 'Bundle_Smartphone6', bundleCode: 'SMARTPHONE6' }
    ]);
}
main().catch((e) => { console.error(e); process.exit(1); });
