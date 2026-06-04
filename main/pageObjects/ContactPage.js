// main/pageObjects/ContactPage.js
const { BasePage } = require('./BasePage');

class ContactPage extends BasePage {
    constructor(page, utils, logger = console) {
        super(page, logger);
        this.utils = utils;
    }

    async createContact(accountId, data = null, useAPI = true) {
        if (useAPI) {
            const contactId = await this.utils.createContactViaAPI(accountId, data);
            this.log.info?.(`Contact created via API: ${contactId}`);
            return contactId;
        }
        throw new Error('❌ UI Contact creation not implemented yet');
    }
}

module.exports = { ContactPage };
