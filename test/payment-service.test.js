import cds from '@sap/cds';
import { expect } from 'chai';

describe('PaymentService Dedicated Test Suite', () => {
    const { POST, axios } = cds.test('.');

    let testOrderId;

    before(async () => {
        const { Orders } = cds.entities('sap.marketplace');
        testOrderId = cds.utils.uuid();

        // Seed an unpaid test order
        await cds.run(
            INSERT.into(Orders).entries({
                ID: testOrderId,
                orderNumber: `ORD-PAYTEST-${Date.now()}`,
                customer_ID: 'cust0000-0000-0000-0000-000000000001',
                shippingAddress_ID: 'addr0000-0000-0000-0000-000000000001',
                billingAddress_ID: 'addr0000-0000-0000-0000-000000000001',
                status: 'PENDING_PAYMENT',
                paymentStatus: 'UNPAID',
                fulfillmentStatus: 'UNFULFILLED',
                currency_code: 'USD',
                subtotal: 100.00,
                discount: 0.00,
                shippingCost: 0.00,
                taxAmount: 8.00,
                totalAmount: 108.00
            })
        );
    });

    it('1. should create payment record and capture funds via createPayment', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const res = await POST('/odata/v4/payment/createPayment', {
            order_ID: testOrderId,
            paymentProvider: 'STRIPE_TEST',
            paymentToken: 'tok_visa_valid'
        });

        expect(res.status).to.equal(200);
        const payment = res.data;
        expect(payment).to.have.property('ID');
        expect(payment.status).to.equal('CAPTURED');
        expect(payment.order_ID).to.equal(testOrderId);
        expect(payment.transactionReference).to.include('PSP-TX-');

        // Verify order status updated to CONFIRMED and PAID
        const { Orders } = cds.entities('sap.marketplace');
        const order = await cds.run(SELECT.one.from(Orders).where({ ID: testOrderId }));
        expect(order.status).to.equal('CONFIRMED');
        expect(order.paymentStatus).to.equal('PAID');
    });

    it('2. should reject duplicate payment on already paid order', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        try {
            await POST('/odata/v4/payment/createPayment', {
                order_ID: testOrderId,
                paymentProvider: 'STRIPE_TEST'
            });
            expect.fail('Should have rejected duplicate payment with 400');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(400);
        }
    });

    it('3. should process refund via refundPayment (requires OrderManager or Admin)', async () => {
        axios.defaults.auth = { username: 'dave_order', password: '' };

        const { Payments } = cds.entities('sap.marketplace');
        const payment = await cds.run(SELECT.one.from(Payments).where({ order_ID: testOrderId }));
        expect(payment).to.exist;

        const res = await POST('/odata/v4/payment/refundPayment', {
            payment_ID: payment.ID,
            amount: 108.00,
            reason: 'Quality defect refund'
        });

        expect(res.status).to.equal(200);
        expect(res.data.value).to.be.true;

        // Verify payment and order statuses are REFUNDED
        const updatedPayment = await cds.run(SELECT.one.from(Payments).where({ ID: payment.ID }));
        expect(updatedPayment.status).to.equal('REFUNDED');

        const { Orders } = cds.entities('sap.marketplace');
        const updatedOrder = await cds.run(SELECT.one.from(Orders).where({ ID: testOrderId }));
        expect(updatedOrder.paymentStatus).to.equal('REFUNDED');
    });

    it('4. should reject refundPayment from unauthorized customer role with 403 Forbidden', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const { Payments } = cds.entities('sap.marketplace');
        const payment = await cds.run(SELECT.one.from(Payments).where({ order_ID: testOrderId }));

        try {
            await POST('/odata/v4/payment/refundPayment', {
                payment_ID: payment.ID,
                amount: 50.00
            });
            expect.fail('Should have rejected customer refund with 403');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(403);
        }
    });

    it('5. should simulate payment failure and mark payment status FAILED', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const failOrderId = cds.utils.uuid();
        const { Orders } = cds.entities('sap.marketplace');
        await cds.run(
            INSERT.into(Orders).entries({
                ID: failOrderId,
                orderNumber: `ORD-FAILTEST-${Date.now()}`,
                customer_ID: 'cust0000-0000-0000-0000-000000000001',
                shippingAddress_ID: 'addr0000-0000-0000-0000-000000000001',
                billingAddress_ID: 'addr0000-0000-0000-0000-000000000001',
                status: 'PENDING_PAYMENT',
                paymentStatus: 'UNPAID',
                fulfillmentStatus: 'UNFULFILLED',
                currency_code: 'USD',
                subtotal: 50.00,
                discount: 0.00,
                shippingCost: 0.00,
                taxAmount: 4.00,
                totalAmount: 54.00
            })
        );

        const res = await POST('/odata/v4/payment/simulatePayment', {
            order_ID: failOrderId,
            outcome: 'FAIL'
        });

        expect(res.status).to.equal(200);
        expect(res.data.status).to.equal('FAILED');

        const order = await cds.run(SELECT.one.from(Orders).where({ ID: failOrderId }));
        expect(order.paymentStatus).to.equal('FAILED');
    });
});
