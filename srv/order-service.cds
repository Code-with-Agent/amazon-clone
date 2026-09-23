using { sap.marketplace as mp } from '../db/schema';

@path: '/odata/v4/order'
@requires: ['Customer', 'OrderManager', 'Seller', 'Administrator']
service OrderService {

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'OrderManager', 'Seller', 'Administrator'] }]
    entity Orders as projection on mp.Orders {
        *,
        items     : Composition of many OrderItems on items.order = $self,
        history   : Composition of many OrderHistory on history.order = $self,
        shipments : Association to many Shipments on shipments.order = $self,
        payment   : Association to one Payments on payment.order = $self
    };

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'OrderManager', 'Seller', 'Administrator'] }]
    entity OrderItems as projection on mp.OrderItems;

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'OrderManager', 'Seller', 'Administrator'] }]
    entity OrderHistory as projection on mp.OrderStatusHistories;

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'OrderManager', 'Seller', 'Administrator'] }]
    entity Shipments as projection on mp.Shipments;

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'OrderManager', 'Seller', 'Administrator'] }]
    entity Payments as projection on mp.Payments;

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'OrderManager', 'Seller', 'Administrator'] }]
    entity Addresses as projection on mp.Addresses;

    type CheckoutResult {
        order_ID      : UUID;
        orderNumber   : String;
        totalAmount   : Decimal(15,2);
        currency      : String;
        status        : String;
        paymentStatus : String;
        message       : String;
    };

    type ReturnItemInput {
        orderItem_ID : UUID;
        quantity     : Integer;
        reason       : String;
    };

    @requires: ['Customer', 'Administrator']
    action checkout(
        shippingAddress_ID : UUID,
        billingAddress_ID  : UUID,
        paymentMethod      : String,
        paymentToken       : String,
        simulateOutcome    : String
    ) returns CheckoutResult;

    @requires: ['Customer', 'OrderManager', 'Administrator']
    action cancelOrder(
        order_ID : UUID,
        reason   : String
    ) returns Orders;

    @requires: ['Customer', 'OrderManager', 'Administrator']
    action returnOrder(
        order_ID : UUID,
        items    : array of ReturnItemInput,
        reason   : String
    ) returns Orders;
}
