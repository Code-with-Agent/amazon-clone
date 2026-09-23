import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'chai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Frontend Routing, Architecture & Controller Tests', () => {

    // -------------------------------------------------------------
    // 1. SHOP-UI ROUTING ARCHITECTURE
    // -------------------------------------------------------------
    describe('1. Shop-UI Manifest & Routing Configuration', () => {
        const manifestPath = path.join(rootDir, 'app', 'shop-ui', 'webapp', 'manifest.json');
        let manifest;

        before(() => {
            expect(fs.existsSync(manifestPath), 'shop-ui manifest.json must exist').to.be.true;
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        });

        it('should have standard SAPUI5 Router configuration', () => {
            const routing = manifest['sap.ui5']?.routing;
            expect(routing).to.exist;
            expect(routing.config.routerClass).to.equal('sap.m.routing.Router');
            expect(routing.config.controlId).to.equal('appControl');
            expect(routing.config.controlAggregation).to.equal('pages');
            expect(routing.config.viewType).to.equal('XML');
        });

        it('should define all 17 required e-commerce routes', () => {
            const routes = manifest['sap.ui5'].routing.routes;
            const routeNames = routes.map(r => r.name);

            const expectedRoutes = [
                'homeRoot', 'home', 'search', 'category', 'product',
                'cart', 'checkout', 'payment', 'orderConfirmation', 'orders',
                'orderDetail', 'account', 'addresses', 'wishlist', 'reviews',
                'help', 'login'
            ];

            for (const expected of expectedRoutes) {
                expect(routeNames).to.include(expected, `Route '${expected}' must be defined in shop-ui manifest.json`);
            }
        });

        it('should map every target to an existing XML view on disk', () => {
            const targets = manifest['sap.ui5'].routing.targets;
            const viewDir = path.join(rootDir, 'app', 'shop-ui', 'webapp', 'view');

            for (const [targetKey, targetConfig] of Object.entries(targets)) {
                const viewFileName = `${targetConfig.viewName}.view.xml`;
                const viewFilePath = path.join(viewDir, viewFileName);
                expect(
                    fs.existsSync(viewFilePath),
                    `Target '${targetKey}' points to '${viewFileName}', which must exist on disk at ${viewFilePath}`
                ).to.be.true;
            }
        });
    });

    // -------------------------------------------------------------
    // 2. ADMIN-UI ROUTING ARCHITECTURE
    // -------------------------------------------------------------
    describe('2. Admin-UI Manifest & Routing Configuration', () => {
        const manifestPath = path.join(rootDir, 'app', 'admin-ui', 'webapp', 'manifest.json');
        let manifest;

        before(() => {
            expect(fs.existsSync(manifestPath), 'admin-ui manifest.json must exist').to.be.true;
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        });

        it('should define all administrative backoffice routes', () => {
            const routes = manifest['sap.ui5'].routing.routes;
            const routeNames = routes.map(r => r.name);

            const expectedRoutes = [
                'overview', 'products', 'productDetail',
                'orders', 'orderDetail', 'customers', 'customerDetail',
                'inventory', 'sellers', 'sellerDetail',
                'promotions', 'promotionDetail', 'reviews', 'reviewDetail',
                'payments', 'paymentDetail', 'shipments', 'shipmentDetail'
            ];

            for (const expected of expectedRoutes) {
                expect(routeNames).to.include(expected, `Admin route '${expected}' must be defined`);
            }
        });

        it('should map every admin target to an existing XML view on disk', () => {
            const targets = manifest['sap.ui5'].routing.targets;
            const viewDir = path.join(rootDir, 'app', 'admin-ui', 'webapp', 'view');

            for (const [targetKey, targetConfig] of Object.entries(targets)) {
                const viewFileName = `${targetConfig.viewName}.view.xml`;
                const viewFilePath = path.join(viewDir, viewFileName);
                expect(
                    fs.existsSync(viewFilePath),
                    `Admin target '${targetKey}' points to '${viewFileName}', which must exist on disk`
                ).to.be.true;
            }
        });
    });

    // -------------------------------------------------------------
    // 3. UI FORMATTERS UNIT TESTS
    // -------------------------------------------------------------
    describe('3. SAPUI5 Formatter Function Unit Tests', () => {
        let formatter;

        before(() => {
            const formatterCode = fs.readFileSync(
                path.join(rootDir, 'app', 'shop-ui', 'webapp', 'model', 'formatter.js'),
                'utf8'
            );

            // Execute in sandboxed closure mimicking sap.ui.define
            let exportedFormatter;
            const sap = {
                ui: {
                    define: function (deps, factory) {
                        exportedFormatter = factory();
                    }
                }
            };

            const evalFn = new Function('sap', formatterCode);
            evalFn(sap);
            formatter = exportedFormatter;
            expect(formatter).to.be.an('object');
        });

        it('formatCurrency should format prices with currency symbols and two decimals', () => {
            expect(formatter.formatCurrency(199.99, 'USD')).to.equal('$199.99');
            expect(formatter.formatCurrency(0, 'USD')).to.equal('$0.00');
            expect(formatter.formatCurrency(null, 'USD')).to.equal('$0.00');
            expect(formatter.formatCurrency(undefined, 'USD')).to.equal('$0.00');
            expect(formatter.formatCurrency(49.5, 'EUR')).to.equal('€49.50');
        });

        it('formatDate and formatDateTime should format ISO dates', () => {
            const isoDate = '2026-09-23T12:00:00.000Z';
            expect(formatter.formatDate(isoDate)).to.be.a('string').with.length.greaterThan(0);
            expect(formatter.formatDateTime(isoDate)).to.be.a('string').with.length.greaterThan(0);
            expect(formatter.formatDate(null)).to.equal('');
        });

        it('formatStatusState should map status strings to Fiori ValueStates', () => {
            expect(formatter.formatStatusState('CONFIRMED')).to.equal('Success');
            expect(formatter.formatStatusState('PAID')).to.equal('Success');
            expect(formatter.formatStatusState('DELIVERED')).to.equal('Success');
            expect(formatter.formatStatusState('ACTIVE')).to.equal('Success');
            expect(formatter.formatStatusState('PENDING_PAYMENT')).to.equal('Warning');
            expect(formatter.formatStatusState('PROCESSING')).to.equal('Warning');
            expect(formatter.formatStatusState('CANCELLED')).to.equal('Error');
            expect(formatter.formatStatusState('PAYMENT_FAILED')).to.equal('Error');
            expect(formatter.formatStatusState('SHIPPED')).to.equal('Information');
            expect(formatter.formatStatusState('UNKNOWN_CODE')).to.equal('None');
        });

        it('formatStockText and formatStockState should handle out-of-stock, low-stock, and in-stock', () => {
            expect(formatter.formatStockText(0)).to.equal('Out of Stock');
            expect(formatter.formatStockState(0)).to.equal('Error');

            expect(formatter.formatStockText(3)).to.equal('Only 3 left in stock - order soon');
            expect(formatter.formatStockState(3)).to.equal('Warning');

            expect(formatter.formatStockText(25)).to.equal('In Stock');
            expect(formatter.formatStockState(25)).to.equal('Success');
        });

        it('formatDiscountBadge and hasDiscount should calculate percentage savings', () => {
            expect(formatter.formatDiscountBadge(100.00, 80.00)).to.equal('Save 20%');
            expect(formatter.hasDiscount(100.00, 80.00)).to.be.true;

            expect(formatter.formatDiscountBadge(100.00, 100.00)).to.equal('');
            expect(formatter.hasDiscount(100.00, 100.00)).to.be.false;

            expect(formatter.formatDiscountBadge(null, 50.00)).to.equal('');
            expect(formatter.hasDiscount(null, 50.00)).to.be.false;
        });

        it('formatRatingStars should format numeric rating with star icon', () => {
            expect(formatter.formatRatingStars(4.8)).to.equal('4.8 ★');
            expect(formatter.formatRatingStars(5)).to.equal('5.0 ★');
            expect(formatter.formatRatingStars(0)).to.equal('0.0 ★');
        });
    });

    // -------------------------------------------------------------
    // 4. APPROUTER ROUTING SPECS
    // -------------------------------------------------------------
    describe('4. App Router Configuration Integrity', () => {
        it('shop-ui xs-app.json should correctly route /odata/v4/* to amazon-clone-srv-api destination', () => {
            const xsAppPath = path.join(rootDir, 'app', 'shop-ui', 'xs-app.json');
            expect(fs.existsSync(xsAppPath)).to.be.true;
            const xsApp = JSON.parse(fs.readFileSync(xsAppPath, 'utf8'));

            const odataRoute = xsApp.routes.find(r => r.source.includes('/odata/v4/'));
            expect(odataRoute).to.exist;
            expect(odataRoute.destination).to.equal('amazon-clone-srv-api');
            expect(odataRoute.target).to.equal('/odata/v4/$1');

            const staticRoute = xsApp.routes.find(r => r.service === 'html5-apps-repo-rt');
            expect(staticRoute).to.exist;
        });

        it('admin-ui xs-app.json should enforce xsuaa authenticationType', () => {
            const xsAppPath = path.join(rootDir, 'app', 'admin-ui', 'xs-app.json');
            expect(fs.existsSync(xsAppPath)).to.be.true;
            const xsApp = JSON.parse(fs.readFileSync(xsAppPath, 'utf8'));

            const odataRoute = xsApp.routes.find(r => r.source.includes('/odata/v4/'));
            expect(odataRoute).to.exist;
            expect(odataRoute.destination).to.equal('amazon-clone-srv-api');
            expect(odataRoute.authenticationType).to.equal('xsuaa');
        });
    });
});
