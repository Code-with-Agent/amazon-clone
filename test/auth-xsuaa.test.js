import cds from '@sap/cds';
import { expect } from 'chai';

describe('SAP BTP XSUAA Authentication & Authorization Enforcement', () => {
    const { GET, POST, axios } = cds.test('.');

    // -------------------------------------------------------------
    // 1. ANONYMOUS / UNAUTHENTICATED ACCESS ENFORCEMENT
    // -------------------------------------------------------------
    describe('1. Unauthenticated (Anonymous) Access', () => {
        beforeEach(() => {
            axios.defaults.auth = undefined;
        });

        it('should allow public access to CatalogService products and categories', async () => {
            const res = await GET('/odata/v4/catalog/Products');
            expect(res.status).to.equal(200);
            expect(res.data.value).to.be.an('array');
        });

        it('should reject unauthenticated access to AdminService with 401 Unauthorized', async () => {
            try {
                await GET('/odata/v4/admin/Products');
                expect.fail('Should have rejected with 401');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(401);
            }
        });

        it('should reject unauthenticated access to CartService with 401 Unauthorized', async () => {
            try {
                await POST('/odata/v4/cart/calculateTotals', {});
                expect.fail('Should have rejected with 401');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(401);
            }
        });

        it('should reject unauthenticated access to CustomerService with 401 Unauthorized', async () => {
            try {
                await GET('/odata/v4/customer/Profile');
                expect.fail('Should have rejected with 401');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(401);
            }
        });

        it('should reject unauthenticated access to OrderService with 401 Unauthorized', async () => {
            try {
                await GET('/odata/v4/order/Orders');
                expect.fail('Should have rejected with 401');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(401);
            }
        });

        it('should reject unauthenticated access to InventoryService with 401 Unauthorized', async () => {
            try {
                await GET('/odata/v4/inventory/Inventories');
                expect.fail('Should have rejected with 401');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(401);
            }
        });

        it('should reject unauthenticated calls to submitReview with 401 Unauthorized', async () => {
            try {
                await POST('/odata/v4/catalog/submitReview', {
                    product_ID: 'p0000000-0000-0000-0000-000000000001',
                    rating: 5,
                    headline: 'Unauthorized Review'
                });
                expect.fail('Should have rejected with 401');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(401);
            }
        });
    });

    // -------------------------------------------------------------
    // 2. CUSTOMER ROLE ENFORCEMENT (alice)
    // -------------------------------------------------------------
    describe('2. Customer Role Permissions (alice)', () => {
        beforeEach(() => {
            axios.defaults.auth = { username: 'alice', password: '' };
        });

        it('should allow customer to read catalog', async () => {
            const res = await GET('/odata/v4/catalog/Products');
            expect(res.status).to.equal(200);
        });

        it('should allow customer to manage cart', async () => {
            const res = await POST('/odata/v4/cart/calculateTotals', {});
            expect(res.status).to.equal(200);
        });

        it('should allow customer to view orders in OrderService', async () => {
            const res = await GET('/odata/v4/order/Orders');
            expect(res.status).to.equal(200);
        });

        it('should REJECT customer from accessing AdminService Products with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/admin/Products');
                expect.fail('Should have rejected customer with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT customer from calling AdminService fulfillShipment with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/fulfillShipment', {
                    order_ID: 'ord00000-0000-0000-0000-000000000001',
                    carrier: 'FEDEX',
                    trackingNumber: 'FDX-TEST'
                });
                expect.fail('Should have rejected customer with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT customer from calling AdminService approveSeller with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/approveSeller', {
                    seller_ID: 'sel00000-0000-0000-0000-000000000001'
                });
                expect.fail('Should have rejected customer with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT customer from accessing InventoryService with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/inventory/Warehouses');
                expect.fail('Should have rejected customer with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });
    });

    // -------------------------------------------------------------
    // 3. SELLER ROLE ENFORCEMENT (seller_tech)
    // -------------------------------------------------------------
    describe('3. Seller Role Permissions (seller_tech)', () => {
        beforeEach(() => {
            axios.defaults.auth = { username: 'seller_tech', password: '' };
        });

        it('should allow seller to access InventoryService Warehouses', async () => {
            const res = await GET('/odata/v4/inventory/Warehouses');
            expect(res.status).to.equal(200);
        });

        it('should allow seller to view orders in OrderService', async () => {
            const res = await GET('/odata/v4/order/Orders');
            expect(res.status).to.equal(200);
        });

        it('should REJECT seller from accessing AdminService with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/admin/Products');
                expect.fail('Should have rejected seller with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT seller from approving sellers with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/approveSeller', {
                    seller_ID: 'sel00000-0000-0000-0000-000000000001'
                });
                expect.fail('Should have rejected seller with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });
    });

    // -------------------------------------------------------------
    // 4. PRODUCT MANAGER ROLE ENFORCEMENT (carol_prod)
    // -------------------------------------------------------------
    describe('4. ProductManager Role Permissions (carol_prod)', () => {
        beforeEach(() => {
            axios.defaults.auth = { username: 'carol_prod', password: '' };
        });

        it('should allow ProductManager to manage products, categories, reviews in AdminService', async () => {
            const prodRes = await GET('/odata/v4/admin/Products');
            expect(prodRes.status).to.equal(200);

            const catRes = await GET('/odata/v4/admin/Categories');
            expect(catRes.status).to.equal(200);

            const revRes = await GET('/odata/v4/admin/Reviews');
            expect(revRes.status).to.equal(200);
        });

        it('should allow ProductManager to moderate customer reviews', async () => {
            const revRes = await GET('/odata/v4/admin/Reviews');
            expect(revRes.data.value.length).to.be.greaterThan(0);
            const review = revRes.data.value[0];

            const res = await POST('/odata/v4/admin/moderateReview', {
                review_ID: review.ID,
                status: 'APPROVED'
            });
            expect(res.status).to.equal(200);
        });

        it('should REJECT ProductManager from accessing AdminService Orders with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/admin/Orders');
                expect.fail('Should have rejected ProductManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT ProductManager from accessing AdminService Shipments with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/admin/Shipments');
                expect.fail('Should have rejected ProductManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT ProductManager from calling fulfillShipment with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/fulfillShipment', {
                    order_ID: 'ord00000-0000-0000-0000-000000000001',
                    carrier: 'DHL',
                    trackingNumber: 'DHL-123'
                });
                expect.fail('Should have rejected ProductManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT ProductManager from calling approveSeller with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/approveSeller', {
                    seller_ID: 'sel00000-0000-0000-0000-000000000001'
                });
                expect.fail('Should have rejected ProductManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });
    });

    // -------------------------------------------------------------
    // 5. ORDER MANAGER ROLE ENFORCEMENT (dave_order)
    // -------------------------------------------------------------
    describe('5. OrderManager Role Permissions (dave_order)', () => {
        beforeEach(() => {
            axios.defaults.auth = { username: 'dave_order', password: '' };
        });

        it('should allow OrderManager to access Orders, Shipments, and Payments in AdminService', async () => {
            const ordRes = await GET('/odata/v4/admin/Orders');
            expect(ordRes.status).to.equal(200);

            const shipRes = await GET('/odata/v4/admin/Shipments');
            expect(shipRes.status).to.equal(200);

            const payRes = await GET('/odata/v4/admin/Payments');
            expect(payRes.status).to.equal(200);
        });

        it('should allow OrderManager to fulfill shipments in AdminService', async () => {
            const res = await POST('/odata/v4/admin/fulfillShipment', {
                order_ID: 'ord00000-0000-0000-0000-000000000001',
                carrier: 'UPS',
                trackingNumber: 'UPS-TRK-789'
            });
            expect(res.status).to.equal(200);
            expect(res.data.status).to.equal('DISPATCHED');
        });

        it('should REJECT OrderManager from accessing AdminService Products with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/admin/Products');
                expect.fail('Should have rejected OrderManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT OrderManager from calling moderateReview with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/moderateReview', {
                    review_ID: 'rev00000-0000-0000-0000-000000000001',
                    status: 'APPROVED'
                });
                expect.fail('Should have rejected OrderManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT OrderManager from calling approveSeller with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/approveSeller', {
                    seller_ID: 'sel00000-0000-0000-0000-000000000001'
                });
                expect.fail('Should have rejected OrderManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });
    });

    // -------------------------------------------------------------
    // 6. INVENTORY MANAGER ROLE ENFORCEMENT (erin_inv)
    // -------------------------------------------------------------
    describe('6. InventoryManager Role Permissions (erin_inv)', () => {
        beforeEach(() => {
            axios.defaults.auth = { username: 'erin_inv', password: '' };
        });

        it('should allow InventoryManager to access Warehouses and Inventories', async () => {
            const whRes = await GET('/odata/v4/inventory/Warehouses');
            expect(whRes.status).to.equal(200);

            const invRes = await GET('/odata/v4/inventory/Inventories');
            expect(invRes.status).to.equal(200);
        });

        it('should allow InventoryManager to sync warehouse stock', async () => {
            const whRes = await GET('/odata/v4/inventory/Warehouses');
            const whId = whRes.data.value[0].ID;
            const invRes = await GET('/odata/v4/inventory/Inventories');
            const variantId = invRes.data.value[0].variant_ID;

            const res = await POST('/odata/v4/inventory/syncWarehouseStock', {
                warehouse_ID: whId,
                variant_ID: variantId,
                countOnHand: 200
            });
            expect(res.status).to.equal(200);
            expect(res.data.value).to.be.true;
        });

        it('should REJECT InventoryManager from accessing AdminService Products with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/admin/Products');
                expect.fail('Should have rejected InventoryManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT InventoryManager from accessing AdminService Orders with 403 Forbidden', async () => {
            try {
                await GET('/odata/v4/admin/Orders');
                expect.fail('Should have rejected InventoryManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should REJECT InventoryManager from calling approveSeller with 403 Forbidden', async () => {
            try {
                await POST('/odata/v4/admin/approveSeller', {
                    seller_ID: 'sel00000-0000-0000-0000-000000000001'
                });
                expect.fail('Should have rejected InventoryManager with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });
    });

    // -------------------------------------------------------------
    // 7. ADMINISTRATOR ROLE ENFORCEMENT (admin)
    // -------------------------------------------------------------
    describe('7. Administrator Role Full Access (admin)', () => {
        beforeEach(() => {
            axios.defaults.auth = { username: 'admin', password: '' };
        });

        it('should allow Administrator full access to AdminService Products', async () => {
            const res = await GET('/odata/v4/admin/Products');
            expect(res.status).to.equal(200);
        });

        it('should allow Administrator full access to AdminService Orders', async () => {
            const res = await GET('/odata/v4/admin/Orders');
            expect(res.status).to.equal(200);
        });

        it('should allow Administrator full access to AdminService Warehouses & Inventories', async () => {
            const whRes = await GET('/odata/v4/admin/Warehouses');
            expect(whRes.status).to.equal(200);

            const invRes = await GET('/odata/v4/admin/Inventories');
            expect(invRes.status).to.equal(200);
        });

        it('should allow Administrator to approve sellers', async () => {
            const sellersRes = await GET('/odata/v4/admin/Sellers');
            const seller = sellersRes.data.value[0];

            const res = await POST('/odata/v4/admin/approveSeller', {
                seller_ID: seller.ID
            });
            expect(res.status).to.equal(200);
            expect(res.data.status).to.equal('APPROVED');
        });

        it('should allow Administrator to moderate reviews', async () => {
            const revRes = await GET('/odata/v4/admin/Reviews');
            const review = revRes.data.value[0];

            const res = await POST('/odata/v4/admin/moderateReview', {
                review_ID: review.ID,
                status: 'APPROVED'
            });
            expect(res.status).to.equal(200);
        });

        it('should allow Administrator to fulfill shipments', async () => {
            const res = await POST('/odata/v4/admin/fulfillShipment', {
                order_ID: 'ord00000-0000-0000-0000-000000000001',
                carrier: 'DHL_EXPRESS',
                trackingNumber: 'DHL-ADMIN-888'
            });
            expect(res.status).to.equal(200);
        });
    });
});
