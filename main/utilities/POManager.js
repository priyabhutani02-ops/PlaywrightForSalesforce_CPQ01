const { LoginPage } = require('../pageObjects/LoginPage');
const { OpportunityPage } = require('../pageObjects/OpportunityPage');
const { QuotePage } = require('../pageObjects/QuotePage');
const { ContactPage } = require('../pageObjects/ContactPage');
const { AccountPage } = require('../pageObjects/AccountPage');
const { QLEPage } = require('../pageObjects/QLEPage');
const { OrderPage } = require('../pageObjects/OrderPage');
const { ContractPage } = require('../pageObjects/ContractPage');
const { AmendmentPage } = require('../pageObjects/AmendmentPage');
const { BundlePage } = require('../pageObjects/BundlePage');
const { Assertions } = require('./Assertions');

class POManager {

    constructor(page, utilityFunctions, logger = console) {
        this.page = page;
        this.utils = utilityFunctions;
        this.log = logger;

        this.loginPage       = new LoginPage(this.page, this.log);
        this.accountPage     = new AccountPage(this.page, this.utils, this.log);
        this.opportunityPage = new OpportunityPage(this.page, this.utils, this.log);
        this.quotePage       = new QuotePage(this.page, this.utils, this.log);
        this.contactPage     = new ContactPage(this.page, this.utils, this.log);
        this.qlePage         = new QLEPage(this.page, this.log);
        this.orderPage       = new OrderPage(this.page, this.utils, this.log);
        this.contractPage    = new ContractPage(this.page, this.utils, this.log);
        this.amendmentPage   = new AmendmentPage(this.page, this.utils, this.log);
        this.bundlePage      = new BundlePage(this.page, this.log);
        this.assertions      = new Assertions(this.utils, this.log);
    }

    getLoginPage()       { return this.loginPage; }
    getAccountPage()     { return this.accountPage; }
    getOpportunityPage() { return this.opportunityPage; }
    getQuotePage()       { return this.quotePage; }
    getContactPage()     { return this.contactPage; }
    getQLEPage()         { return this.qlePage; }
    getOrderPage()       { return this.orderPage; }
    getContractPage()    { return this.contractPage; }
    getAmendmentPage()   { return this.amendmentPage; }
    getBundlePage()      { return this.bundlePage; }
    getAssertions()      { return this.assertions; }

    async createAccountHybrid(useAPI = true) {
        return await this.accountPage.createAccount(null, useAPI);
    }

    async createContactHybrid(accountId, useAPI = true) {
        return await this.contactPage.createContact(accountId, null, useAPI);
    }

    async createOpportunityHybrid(accountId, useAPI = true) {
        return await this.opportunityPage.createOpportunity(null, useAPI, accountId);
    }

    async createQuoteHybrid(opportunityId, accountId, contactId = null, useAPI = true) {
        if (useAPI) {
            return await this.utils.createQuoteViaAPI(opportunityId, accountId, contactId);
        }
        return await this.quotePage.createQuote(opportunityId, accountId, contactId);
    }
}

module.exports = { POManager };
