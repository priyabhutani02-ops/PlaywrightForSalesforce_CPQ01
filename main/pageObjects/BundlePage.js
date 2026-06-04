// main/pageObjects/BundlePage.js
// Bundle configuration screen (Configure Products) — deep shadow-DOM logic.
const { BasePage } = require('./BasePage');

class BundlePage extends BasePage {
    constructor(page, logger = console) {
        super(page, logger);

        // ── LOCATOR DEFINITIONS ────────────────────────────────────────────────
        this.qleIframe = 'iframe[name^="vfFrameId_"][height="100%"]';
        this.frame = () => this.page.frameLocator(this.qleIframe);
        this.saveButton = () => this.frame().getByRole('button', { name: 'Save', exact: true });
    }

    _sbFrame() {
        return this.page.frames().find(f => f.url().includes('/apex/sb?') && f.url().includes('sbqq'));
    }

    // Deep-find script: productCode ke swipe-container mein radio/checkbox click.
    _getDeepFindScript(productCode, elementType) {
        return `
        (function() {
            function deepFindAll(root, selector, results) {
                results = results || [];
                var found = root.querySelectorAll(selector);
                for (var i = 0; i < found.length; i++) results.push(found[i]);
                var all = root.querySelectorAll('*');
                for (var j = 0; j < all.length; j++) {
                    if (all[j].shadowRoot) deepFindAll(all[j].shadowRoot, selector, results);
                }
                return results;
            }
            var allSpans = deepFindAll(document, 'span#me');
            var targetSpan = null;
            for (var i = 0; i < allSpans.length; i++) {
                if (allSpans[i].textContent.trim() === '${productCode}') { targetSpan = allSpans[i]; break; }
            }
            if (!targetSpan) return 'span-not-found';
            var node = targetSpan, swipeContainer = null;
            for (var j = 0; j < 15; j++) {
                if (!node) break;
                if (node.tagName === 'SB-SWIPE-CONTAINER') { swipeContainer = node; break; }
                node = node.parentElement || (node.getRootNode && node.getRootNode().host);
            }
            if (!swipeContainer) return 'swipe-container-not-found';
            var elements = deepFindAll(swipeContainer, '${elementType}');
            if (!elements.length) return '${elementType}-not-found';
            var el = elements[0];
            if (el.getAttribute('aria-checked') === 'true') return 'already-selected';
            el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
            return 'clicked';
        })()`;
    }

    async _selectOption(productCode, elementType, label) {
        await this.page.waitForTimeout(1000);
        const sbFrame = this._sbFrame();
        if (!sbFrame) throw new Error('❌ Configure Products frame not found');

        const result = await sbFrame.evaluate(this._getDeepFindScript(productCode, elementType));
        if (result === 'already-selected' || result === 'span-not-found') {
            this.log.info?.(`${productCode} — already selected, skipping`);
            return;
        }
        if (result !== 'clicked') throw new Error(`❌ ${label} select failed for ${productCode}: ${result}`);
        this.log.info?.(`${label} selected: ${productCode}`);
    }

    async selectRadioOption(productCode)    { return this._selectOption(productCode, 'paper-radio-button', 'Radio'); }
    async selectCheckboxOption(productCode) { return this._selectOption(productCode, 'paper-checkbox', 'Checkbox'); }

    async configureBundleOptions(options) {
        for (const option of options) {
            if (option.selectionType === 'radio') await this.selectRadioOption(option.productCode);
            else if (option.selectionType === 'checkbox') await this.selectCheckboxOption(option.productCode);
            await this.page.waitForTimeout(500);
        }
        this.log.info?.('All bundle options configured');
    }

    async saveBundleConfig() {
        const sbFrame = this._sbFrame();
        if (!sbFrame) throw new Error('❌ Configure Products frame not found');
        await this.saveButton().click();
        this.log.info?.('Bundle config saved');
        await this.page.waitForTimeout(3000);
        this.log.info?.('Back to QLE');
    }
}

module.exports = { BundlePage };
