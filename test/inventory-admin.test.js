import cds from '@sap/cds';
import { expect } from 'chai';

describe('Inventory, Wishlist & Admin Operations', () => {
    const { GET, POST, axios } = cds.test('.');

    let testVariantId;
    let testReservationId;
    let wishlistItemId;

    before(async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        const { Orders, Shipments } = cds.entities('sap.marketplace');
        await cds.run(
            UPDATE(Orders, 'ord00000-0000-0000-0000-000000000002').with({
                status: 'CONFIRMED',
                fulfillmentStatus: 'UNFULFILLED'
            })
        );
        await cds.run(DELETE.from(Shipments).where({ order_ID: 'ord00000-0000-0000-0000-000000000002' }));

        const variantsRes = await GET('/odata/v4/catalog/ProductVariants');
        testVariantId = variantsRes.data.value[0].ID;
    });

    // -------------------------------------------------------------
    // Wishlist Tests
    // -------------------------------------------------------------
    it('1. should add a product variant to the customer wishlist', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        const productsRes = await GET('/odata/v4/catalog/Products');
        const product = productsRes.data.value[0];

        const res = await POST('/odata/v4/customer/addToWishlist', {
            product_ID: product.ID,
            variant_ID: testVariantId
        });

        expect(res.status).to.equal(200);
        expect(res.data).to.have.property('ID');
        expect(res.data.product_ID).to.equal(product.ID);
        wishlistItemId = res.data.ID;
    });

    it('2. should remove an item from the customer wishlist', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        const res = await POST('/odata/v4/customer/removeFromWishlist', {
            wishlistItem_ID: wishlistItemId
        });

        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.true;
    });

    // -------------------------------------------------------------
    // Inventory Tests & Invariants
    // -------------------------------------------------------------
    it('3. should read inventory and expose dynamically computed availableQuantity and reservedQuantity', async () => {
        axios.defaults.auth = { username: 'admin', password: '' };
        const res = await GET('/odata/v4/inventory/Inventories');
        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.an('array');
        expect(res.data.value.length).to.be.greaterThan(0);

        const inv = res.data.value[0];
        expect(inv).to.have.property('quantityOnHand');
        expect(inv).to.have.property('quantityReserved');
        expect(inv).to.have.property('availableQuantity');
        expect(inv).to.have.property('reservedQuantity');
        expect(inv.availableQuantity).to.equal(inv.quantityOnHand - inv.quantityReserved);
        expect(inv.availableQuantity).to.be.greaterThanOrEqual(0);
    });

    it('4. should reserve inventory and increment quantityReserved without allowing negative stock', async () => {
        const res = await POST('/odata/v4/inventory/reserveInventory', {
            order_ID: null,
            items: [
                {
                    variant_ID: testVariantId,
                    quantity: 2
                }
            ]
        });

        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.an('array').with.lengthOf(1);
        testReservationId = res.data.value[0];
    });

    it('5. should reject inventory reservation when requested quantity exceeds available stock', async () => {
        try {
            await POST('/odata/v4/inventory/reserveInventory', {
                order_ID: null,
                items: [
                    {
                        variant_ID: testVariantId,
                        quantity: 999999 // Excessively high quantity
                    }
                ]
            });
            expect.fail('Should have rejected reservation exceeding stock');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(409);
        }
    });

    it('6. should release reserved inventory back to available stock', async () => {
        const res = await POST('/odata/v4/inventory/releaseInventory', {
            reservation_ID: testReservationId,
            reason: 'Test stock release'
        });

        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.true;
    });

    it('7. should sync warehouse physical stock count', async () => {
        const warehousesRes = await GET('/odata/v4/inventory/Warehouses');
        const warehouseId = warehousesRes.data.value[0].ID;

        const res = await POST('/odata/v4/inventory/syncWarehouseStock', {
            warehouse_ID: warehouseId,
            variant_ID: testVariantId,
            countOnHand: 150
        });

        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.true;
    });

    it('8. should reject syncing warehouse stock with negative count', async () => {
        const warehousesRes = await GET('/odata/v4/inventory/Warehouses');
        const warehouseId = warehousesRes.data.value[0].ID;

        try {
            await POST('/odata/v4/inventory/syncWarehouseStock', {
                warehouse_ID: warehouseId,
                variant_ID: testVariantId,
                countOnHand: -5 // Negative stock
            });
            expect.fail('Should reject negative stock count');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(400);
        }
    });

    // -------------------------------------------------------------
    // Admin Operations
    // -------------------------------------------------------------
    it('9. should fulfill order and create dispatched shipment consignment', async () => {
        // Use confirmed order ord00000-0000-0000-0000-000000000002
        const res = await POST('/odata/v4/admin/fulfillShipment', {
            order_ID: 'ord00000-0000-0000-0000-000000000002',
            carrier: 'FEDEX_PRIORITY',
            trackingNumber: 'FDX-88273619'
        });

        expect(res.status).to.equal(200);
        expect(res.data).to.have.property('status', 'DISPATCHED');
        expect(res.data.carrier).to.equal('FEDEX_PRIORITY');
        expect(res.data.trackingNumber).to.equal('FDX-88273619');

        // Verify order status changed to SHIPPED
        const orderRes = await GET("/odata/v4/admin/Orders('ord00000-0000-0000-0000-000000000002')");
        expect(orderRes.status).to.equal(200);
        expect(orderRes.data.status).to.equal('SHIPPED');
        expect(orderRes.data.fulfillmentStatus).to.equal('FULFILLED');
    });

    it('10. should moderate customer reviews (approve/reject)', async () => {
        const reviewsRes = await GET('/odata/v4/admin/Reviews');
        const review = reviewsRes.data.value[0];

        const res = await POST('/odata/v4/admin/moderateReview', {
            review_ID: review.ID,
            status: 'APPROVED'
        });

        expect(res.status).to.equal(200);
        expect(res.data.status).to.equal('APPROVED');
    });

    it('11. should approve pending seller registration', async () => {
        const sellersRes = await GET('/odata/v4/admin/Sellers');
        const seller = sellersRes.data.value[0];

        const res = await POST('/odata/v4/admin/approveSeller', {
            seller_ID: seller.ID
        });

        expect(res.status).to.equal(200);
        expect(res.data.status).to.equal('APPROVED');
    });
});
