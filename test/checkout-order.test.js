import cds from '@sap/cds';
import { expect } from 'chai';

describe('Order & Checkout Operations (Real-World Enterprise Flows)', () => {
    const { GET, POST, axios } = cds.test('.');

    let confirmedOrderId;

    before(async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        const { Orders, OrderItems } = cds.entities('sap.marketplace');
        // Reset sample delivered order to pristine state for return testing
        await cds.run(
            UPDATE(Orders, 'ord00000-0000-0000-0000-000000000001').with({
                status: 'DELIVERED',
                fulfillmentStatus: 'FULFILLED',
                paymentStatus: 'PAID'
            })
        );
        await cds.run(
            UPDATE(OrderItems).where({ order_ID: 'ord00000-0000-0000-0000-000000000001' }).with({
                status: 'DELIVERED'
            })
        );
    });

    // -------------------------------------------------------------
    // CHECKOUT SUCCESS FLOW (18 STEPS)
    // -------------------------------------------------------------
    it('1. should execute 18-step checkout successfully (validate cart, reserve stock, create order, capture payment, commit stock, notify)', async () => {
        // Step 1 prep: Add item to cart
        const offersRes = await GET('/odata/v4/catalog/ProductOffers');
        const offer = offersRes.data.value[0];

        await POST('/odata/v4/cart/addToCart', {
            offer_ID: offer.ID,
            quantity: 1
        });

        // Apply coupon
        await POST('/odata/v4/cart/applyCoupon', {
            couponCode: 'SAVE10'
        });

        // Execute checkout
        const res = await POST('/odata/v4/order/checkout', {
            paymentMethod: 'CREDIT_CARD',
            paymentToken: 'tok_visa_success_4242',
            simulateOutcome: 'SUCCESS'
        });

        expect(res.status).to.equal(200);
        const result = res.data;
        expect(result).to.have.property('order_ID');
        expect(result).to.have.property('orderNumber');
        expect(result.orderNumber).to.match(/^ORD-\d{8}-\d{4}$/);
        expect(result).to.have.property('status', 'CONFIRMED');
        expect(result).to.have.property('paymentStatus', 'PAID');
        expect(Number(result.totalAmount)).to.be.greaterThan(0);

        confirmedOrderId = result.order_ID;

        // Verify order items were snapshotted
        const itemsRes = await GET(`/odata/v4/order/Orders(${confirmedOrderId})/items`);
        expect(itemsRes.status).to.equal(200);
        expect(itemsRes.data.value.length).to.be.greaterThan(0);
        const firstLine = itemsRes.data.value[0];
        expect(firstLine).to.have.property('productTitle');
        expect(firstLine).to.have.property('variantSku');
        expect(Number(firstLine.unitPrice)).to.be.greaterThan(0);

        // Verify payment record was created and captured
        const payRes = await GET(`/odata/v4/payment/Payments?$filter=order_ID eq ${confirmedOrderId}`);
        expect(payRes.status).to.equal(200);
        // Verify expanding payment, items, shipments on Orders works for OrderConfirmation view
        const orderWithExpands = await GET(`/odata/v4/order/Orders(${confirmedOrderId})?$expand=items,shipments,payment`);
        expect(orderWithExpands.status).to.equal(200);
        expect(orderWithExpands.data).to.have.property('orderNumber');
        expect(orderWithExpands.data.items.length).to.be.greaterThan(0);
        expect(orderWithExpands.data.payment).to.have.property('status', 'CAPTURED');

        // Verify cart is now empty
        const validationRes = await POST('/odata/v4/cart/validateCart', {});
        expect(validationRes.data.isValid).to.be.false;
        expect(validationRes.data.issues).to.include('Shopping cart is empty');
    });

    // -------------------------------------------------------------
    // CHECKOUT FAILURE SCENARIOS
    // -------------------------------------------------------------
    it('2. should reject checkout when shopping cart is empty', async () => {
        try {
            await POST('/odata/v4/order/checkout', {
                paymentMethod: 'CREDIT_CARD'
            });
            expect.fail('Should have rejected checkout on empty cart');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(400);
        }
    });

    it('3. should handle payment simulation failure and release inventory holds', async () => {
        // Add item to cart
        const offersRes = await GET('/odata/v4/catalog/ProductOffers');
        const offer = offersRes.data.value[0];

        await POST('/odata/v4/cart/addToCart', {
            offer_ID: offer.ID,
            quantity: 1
        });

        // Checkout with simulateOutcome: 'FAIL'
        const res = await POST('/odata/v4/order/checkout', {
            paymentMethod: 'CREDIT_CARD',
            simulateOutcome: 'FAIL'
        });

        expect(res.status).to.equal(200);
        expect(res.data.status).to.equal('PAYMENT_FAILED');
        expect(res.data.paymentStatus).to.equal('FAILED');
        expect(res.data.message).to.include('Payment authorization failed');

        // Verify reservations were released
        const { InventoryReservations } = cds.entities('sap.marketplace');
        const releasedHolds = await cds.run(
            SELECT.from(InventoryReservations).where({ order_ID: res.data.order_ID })
        );
        expect(releasedHolds.length).to.be.greaterThan(0);
        expect(releasedHolds[0].status).to.equal('RELEASED');
    });

    // -------------------------------------------------------------
    // ORDER CANCELLATION FLOW
    // -------------------------------------------------------------
    it('4. should cancel confirmed order, restock inventory, issue refund, and notify customer', async () => {
        const res = await POST('/odata/v4/order/cancelOrder', {
            order_ID: confirmedOrderId,
            reason: 'Accidental duplicate order'
        });

        expect(res.status).to.equal(200);
        expect(res.data.status).to.equal('CANCELLED');
        expect(res.data.paymentStatus).to.equal('REFUNDED');
        expect(res.data.cancellationReason).to.equal('Accidental duplicate order');

        // Verify refund payment record
        const payRes = await GET(`/odata/v4/payment/Payments?$filter=order_ID eq ${confirmedOrderId}`);
        expect(payRes.data.value[0].status).to.equal('REFUNDED');
    });

    it('5. should reject cancelling an order that has already been delivered', async () => {
        try {
            await POST('/odata/v4/order/cancelOrder', {
                order_ID: 'ord00000-0000-0000-0000-000000000001', // Pre-delivered order
                reason: 'Want to cancel delivered order'
            });
            expect.fail('Should reject cancellation of delivered order');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(400);
        }
    });

    // -------------------------------------------------------------
    // RETURN FLOW
    // -------------------------------------------------------------
    it('6. should process return on delivered order, generate RMA, restock warehouse, and refund payment', async () => {
        const res = await POST('/odata/v4/order/returnOrder', {
            order_ID: 'ord00000-0000-0000-0000-000000000001',
            reason: 'Item defective or not as described',
            items: [
                {
                    orderItem_ID: 'oi000000-0000-0000-0000-000000000001',
                    quantity: 1,
                    reason: 'Crack on headphone headband'
                }
            ]
        });

        expect(res.status).to.equal(200);
        expect(res.data.status).to.equal('RETURNED');
        expect(res.data.fulfillmentStatus).to.equal('RETURNED');
        expect(res.data.paymentStatus).to.equal('REFUNDED');
        expect(res.data).to.have.property('rmaNumber');
        expect(res.data.rmaNumber).to.match(/^RMA-ORD-/);
    });

    it('7. should reject return on an order that is not delivered', async () => {
        try {
            await POST('/odata/v4/order/returnOrder', {
                order_ID: confirmedOrderId, // Status is CANCELLED, not DELIVERED
                reason: 'Should fail'
            });
            expect.fail('Should reject return on non-delivered order');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(400);
        }
    });
});
