import cds from '@sap/cds';
import { expect } from 'chai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('Frontend & OData Integration Contract Tests', () => {
    const { GET, axios } = cds.test('.');

    // -------------------------------------------------------------
    // 1. SHOP-UI DATASOURCES METADATA CONTRACT
    // -------------------------------------------------------------
    describe('1. Shop-UI DataSources Contract Verification', () => {
        const manifestPath = path.join(rootDir, 'app', 'shop-ui', 'webapp', 'manifest.json');
        let dataSources;

        before(() => {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            dataSources = manifest['sap.app'].dataSources;
            expect(dataSources).to.be.an('object');
        });

        it('catalogService data source should provide valid OData V4 EDMX metadata', async () => {
            axios.defaults.auth = undefined;
            const uri = dataSources.catalogService.uri;
            expect(uri).to.equal('/odata/v4/catalog/');

            const res = await GET('/odata/v4/catalog/$metadata');
            expect(res.status).to.equal(200);
            expect(res.headers['content-type']).to.include('xml');
            expect(res.data).to.include('EntityType Name="Products"');
            expect(res.data).to.include('EntityType Name="Categories"');
            expect(res.data).to.include('EntityType Name="ProductVariants"');
            expect(res.data).to.include('Action Name="submitReview"');
        });

        it('cartService data source should provide active cart and cart items entities', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };
            const uri = dataSources.cartService.uri;
            expect(uri).to.equal('/odata/v4/cart/');

            const res = await GET('/odata/v4/cart/$metadata');
            expect(res.status).to.equal(200);
            expect(res.headers['content-type']).to.include('xml');
            expect(res.data).to.include('EntityType Name="ActiveCart"');
            expect(res.data).to.include('EntityType Name="CartItems"');
            expect(res.data).to.include('Action Name="addToCart"');
            expect(res.data).to.include('Action Name="updateCartQuantity"');
            expect(res.data).to.include('Action Name="applyCoupon"');
        });

        it('orderService data source should provide orders and checkout action', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };
            const uri = dataSources.orderService.uri;
            expect(uri).to.equal('/odata/v4/order/');

            const res = await GET('/odata/v4/order/$metadata');
            expect(res.status).to.equal(200);
            expect(res.headers['content-type']).to.include('xml');
            expect(res.data).to.include('EntityType Name="Orders"');
            expect(res.data).to.include('EntityType Name="OrderItems"');
            expect(res.data).to.include('Action Name="checkout"');
            expect(res.data).to.include('Action Name="cancelOrder"');
            expect(res.data).to.include('Action Name="returnOrder"');
        });

        it('customerService data source should provide profile, wishlist, and addresses', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };
            const uri = dataSources.customerService.uri;
            expect(uri).to.equal('/odata/v4/customer/');

            const res = await GET('/odata/v4/customer/$metadata');
            expect(res.status).to.equal(200);
            expect(res.headers['content-type']).to.include('xml');
            expect(res.data).to.include('EntityType Name="Profile"');
            expect(res.data).to.include('EntityType Name="Addresses"');
            expect(res.data).to.include('EntityType Name="Wishlists"');
            expect(res.data).to.include('Action Name="addToWishlist"');
        });
    });

    // -------------------------------------------------------------
    // 2. ADMIN-UI DATASOURCES METADATA CONTRACT
    // -------------------------------------------------------------
    describe('2. Admin-UI Main Service Contract Verification', () => {
        const manifestPath = path.join(rootDir, 'app', 'admin-ui', 'webapp', 'manifest.json');
        let dataSources;

        before(() => {
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            dataSources = manifest['sap.app'].dataSources;
            expect(dataSources).to.be.an('object');
        });

        it('mainService data source should expose administrative entities and actions', async () => {
            axios.defaults.auth = { username: 'admin', password: '' };
            const uri = dataSources.mainService.uri;
            expect(uri).to.equal('/odata/v4/admin/');

            const res = await GET('/odata/v4/admin/$metadata');
            expect(res.status).to.equal(200);
            expect(res.headers['content-type']).to.include('xml');
            expect(res.data).to.include('EntityType Name="Products"');
            expect(res.data).to.include('EntityType Name="Orders"');
            expect(res.data).to.include('EntityType Name="Inventories"');
            expect(res.data).to.include('EntityType Name="Sellers"');
            expect(res.data).to.include('EntityType Name="Shipments"');
            expect(res.data).to.include('Action Name="fulfillShipment"');
            expect(res.data).to.include('Action Name="moderateReview"');
            expect(res.data).to.include('Action Name="approveSeller"');
        });
    });

    // -------------------------------------------------------------
    // 3. UI MODEL SCHEMA VALIDATION (Entity Property Contracts)
    // -------------------------------------------------------------
    describe('3. UI Binding Property Contracts', () => {
        it('catalog products response must contain all properties bound in ProductCard and ProductDetails', async () => {
            axios.defaults.auth = undefined;
            const res = await GET('/odata/v4/catalog/Products?$expand=variants,images,category');
            expect(res.status).to.equal(200);

            const product = res.data.value[0];
            const requiredProperties = [
                'ID', 'sku', 'brand', 'title', 'description',
                'averageRating', 'reviewCount', 'isFeatured', 'status'
            ];

            for (const prop of requiredProperties) {
                expect(product).to.have.property(prop);
            }
        });

        it('active cart response must contain all properties bound in CartSummary and CartView', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };
            const res = await GET('/odata/v4/cart/ActiveCart?$expand=items');
            expect(res.status).to.equal(200);

            const cart = Array.isArray(res.data.value) ? res.data.value[0] : res.data;
            const requiredProperties = [
                'ID', 'currency_code', 'subtotalAmount', 'discountAmount',
                'shippingEstimate', 'taxEstimate', 'totalAmount'
            ];

            for (const prop of requiredProperties) {
                expect(cart).to.have.property(prop);
            }
        });

        it('orders response must contain all properties bound in OrdersView and OrderConfirmation', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };
            const res = await GET('/odata/v4/order/Orders?$expand=items,shipments,payment');
            expect(res.status).to.equal(200);

            if (res.data.value.length > 0) {
                const order = res.data.value[0];
                const requiredProperties = [
                    'ID', 'orderNumber', 'status', 'paymentStatus',
                    'subtotal', 'discount', 'shippingCost', 'taxAmount', 'totalAmount'
                ];

                for (const prop of requiredProperties) {
                    expect(order).to.have.property(prop);
                }
            }
        });
    });
});
