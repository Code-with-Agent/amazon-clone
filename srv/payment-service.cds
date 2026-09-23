using { sap.marketplace as mp } from '../db/schema';

@path: '/odata/v4/payment'
@requires: ['Customer', 'OrderManager', 'Administrator']
service PaymentService {

    @readonly
    entity Payments as projection on mp.Payments;

    @requires: ['Customer', 'Administrator']
    action createPayment(
        order_ID        : UUID,
        paymentProvider : String,
        paymentToken    : String,
        paymentMethod   : String
    ) returns Payments;

    @requires: ['Customer', 'Administrator']
    action simulatePayment(
        order_ID : UUID,
        outcome  : String // 'SUCCESS' or 'FAIL'
    ) returns Payments;

    @requires: ['OrderManager', 'Administrator']
    action refundPayment(
        payment_ID : UUID,
        amount     : Decimal(15,2),
        reason     : String
    ) returns Boolean;
}
