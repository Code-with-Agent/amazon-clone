import cds from '@sap/cds';

export default class PaymentService extends cds.ApplicationService {
    async init() {
        const {
            Payments, Orders, OrderStatusHistories, Inventories, InventoryReservations
        } = cds.entities('sap.marketplace');

        // Helper to commit inventory reservations upon successful payment
        const commitOrderReservations = async (tx, orderId) => {
            const reservations = await tx.run(
                SELECT.from(InventoryReservations).where({ order_ID: orderId, status: 'RESERVED' })
            );

            for (const res of reservations) {
                const inv = await tx.run(SELECT.one.from(Inventories).where({ ID: res.inventory_ID }));
                if (inv) {
                    const newOnHand = Math.max(0, inv.quantityOnHand - res.quantity);
                    const newReserved = Math.max(0, inv.quantityReserved - res.quantity);
                    await tx.run(
                        UPDATE(Inventories, inv.ID).with({
                            quantityOnHand: newOnHand,
                            quantityReserved: newReserved
                        })
                    );
                }
                await tx.run(
                    UPDATE(InventoryReservations, res.ID).with({ status: 'COMMITTED' })
                );
            }
        };

        // Helper to release inventory reservations upon payment failure
        const releaseOrderReservations = async (tx, orderId) => {
            const reservations = await tx.run(
                SELECT.from(InventoryReservations).where({ order_ID: orderId, status: 'RESERVED' })
            );

            for (const res of reservations) {
                const inv = await tx.run(SELECT.one.from(Inventories).where({ ID: res.inventory_ID }));
                if (inv) {
                    await tx.run(
                        UPDATE(Inventories, inv.ID).with({
                            quantityReserved: Math.max(0, inv.quantityReserved - res.quantity)
                        })
                    );
                }
                await tx.run(
                    UPDATE(InventoryReservations, res.ID).with({ status: 'RELEASED' })
                );
            }
        };

        // -------------------------------------------------------------
        // ACTION: createPayment
        // -------------------------------------------------------------
        this.on('createPayment', async (req) => {
            const { order_ID, paymentProvider, paymentToken, paymentMethod } = req.data;
            if (!order_ID) return req.reject(400, 'Order ID is required');

            const tx = cds.tx(req);
            const order = await tx.run(SELECT.one.from(Orders).where({ ID: order_ID }));
            if (!order) return req.reject(404, 'Order not found');

            if (order.paymentStatus === 'PAID') {
                return req.reject(400, 'Order has already been paid');
            }

            const pspRef = `PSP-TX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
            const paymentId = cds.utils.uuid();

            const payment = {
                ID: paymentId,
                order_ID: order_ID,
                paymentMethod: paymentMethod || 'CREDIT_CARD',
                paymentProvider: paymentProvider || 'MOCK_STRIPE',
                transactionReference: pspRef,
                amount: order.totalAmount,
                currency_code: order.currency_code || 'USD',
                status: 'CAPTURED',
                rawGatewayResponse: JSON.stringify({
                    gateway: paymentProvider || 'MOCK_STRIPE',
                    token: paymentToken || 'tok_visa_sample',
                    authorized: true,
                    timestamp: new Date().toISOString()
                })
            };

            await tx.run(INSERT.into(Payments).entries(payment));

            // Update order status
            await tx.run(
                UPDATE(Orders, order_ID).with({
                    status: 'CONFIRMED',
                    paymentStatus: 'PAID'
                })
            );

            // Finalize inventory deduction
            await commitOrderReservations(tx, order_ID);

            // Record status history
            const userAttrId = req.user?.attr?.id || req.user?.id || 'system';
            await tx.run(
                INSERT.into(OrderStatusHistories).entries({
                    ID: cds.utils.uuid(),
                    order_ID: order_ID,
                    oldStatus: order.status,
                    newStatus: 'CONFIRMED',
                    changedAt: new Date().toISOString(),
                    changedBy: userAttrId,
                    notes: `Payment captured via ${payment.paymentProvider}. Ref: ${pspRef}`
                })
            );

            return payment;
        });

        // -------------------------------------------------------------
        // ACTION: simulatePayment
        // -------------------------------------------------------------
        this.on('simulatePayment', async (req) => {
            const { order_ID, outcome } = req.data;
            if (!order_ID) return req.reject(400, 'Order ID is required');

            const isSuccess = (outcome || 'SUCCESS').toUpperCase() !== 'FAIL';
            const tx = cds.tx(req);
            const order = await tx.run(SELECT.one.from(Orders).where({ ID: order_ID }));
            if (!order) return req.reject(404, 'Order not found');

            const paymentId = cds.utils.uuid();
            const pspRef = `PSP-SIM-${Date.now()}`;

            if (isSuccess) {
                const payment = {
                    ID: paymentId,
                    order_ID: order_ID,
                    paymentMethod: 'CREDIT_CARD',
                    paymentProvider: 'SIMULATOR',
                    transactionReference: pspRef,
                    amount: order.totalAmount,
                    currency_code: order.currency_code || 'USD',
                    status: 'CAPTURED',
                    rawGatewayResponse: JSON.stringify({ simulated: true, outcome: 'SUCCESS' })
                };

                await tx.run(INSERT.into(Payments).entries(payment));
                await tx.run(
                    UPDATE(Orders, order_ID).with({
                        status: 'CONFIRMED',
                        paymentStatus: 'PAID'
                    })
                );
                await commitOrderReservations(tx, order_ID);
                return payment;
            } else {
                const payment = {
                    ID: paymentId,
                    order_ID: order_ID,
                    paymentMethod: 'CREDIT_CARD',
                    paymentProvider: 'SIMULATOR',
                    transactionReference: pspRef,
                    amount: order.totalAmount,
                    currency_code: order.currency_code || 'USD',
                    status: 'FAILED',
                    rawGatewayResponse: JSON.stringify({ simulated: true, outcome: 'FAIL', reason: 'Insufficient funds' })
                };

                await tx.run(INSERT.into(Payments).entries(payment));
                await tx.run(
                    UPDATE(Orders, order_ID).with({
                        paymentStatus: 'FAILED'
                    })
                );
                await releaseOrderReservations(tx, order_ID);
                return payment;
            }
        });

        // -------------------------------------------------------------
        // ACTION: refundPayment
        // -------------------------------------------------------------
        this.on('refundPayment', async (req) => {
            const { payment_ID, amount, reason } = req.data;
            if (!payment_ID) return req.reject(400, 'Payment ID is required');

            const tx = cds.tx(req);
            const payment = await tx.run(SELECT.one.from(Payments).where({ ID: payment_ID }));
            if (!payment) return req.reject(404, 'Payment record not found');

            await tx.run(
                UPDATE(Payments, payment_ID).with({
                    status: 'REFUNDED',
                    rawGatewayResponse: JSON.stringify({
                        refunded: true,
                        amount: amount || payment.amount,
                        reason: reason || 'Customer requested refund'
                    })
                })
            );

            await tx.run(
                UPDATE(Orders, payment.order_ID).with({ paymentStatus: 'REFUNDED' })
            );

            return true;
        });

        return super.init();
    }
}
