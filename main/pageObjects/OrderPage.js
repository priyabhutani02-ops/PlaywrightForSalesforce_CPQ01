// main/pageObjects/OrderPage.js
const { BasePage } = require('./BasePage');

class OrderPage extends BasePage {
    constructor(page, utils, logger = console) {
        super(page, logger);
        this.utils = utils;
    }

    async createOrderFromQuote(quoteId) {
        return await this.utils.createOrderFromQuote(quoteId);
    }

    async activateOrder(orderId) {
        return await this.utils.activateOrder(orderId);
    }
}

module.exports = { OrderPage };
