using { sap.marketplace as mp } from '../db/schema';

@path: '/odata/v4/admin'
@requires: ['ProductManager', 'OrderManager', 'InventoryManager', 'Administrator']
service AdminService {

    @odata.draft.enabled
    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity Categories as projection on mp.Categories;

    @odata.draft.enabled
    @cds.redirection.target
    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity Products as projection on mp.Products {
        *,
        virtual price                    : Decimal(15,2),
        virtual stock                    : Integer,
        virtual active                   : Boolean,
        virtual stockCriticality         : Integer,
        virtual productStatusCriticality : Integer,
        category                         : redirected to Categories,
        variants                         : redirected to ProductVariants,
        images                           : redirected to ProductImages,
        reviews                          : redirected to Reviews
    };

    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity ProductVariants as projection on mp.ProductVariants;

    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity ProductImages as projection on mp.ProductImages;

    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity ProductOffers as projection on mp.ProductOffers;

    @restrict: [{ grant: '*', to: 'Administrator' }]
    entity Sellers as projection on mp.Sellers {
        *,
        virtual statusCriticality : Integer
    };

    @restrict: [{ grant: '*', to: ['InventoryManager', 'Administrator'] }]
    entity Warehouses as projection on mp.Warehouses;

    @restrict: [{ grant: '*', to: ['InventoryManager', 'Administrator'] }]
    entity Inventories as projection on mp.Inventories {
        *,
        virtual availableQuantity : Integer,
        virtual reservedQuantity  : Integer,
        virtual stockStatus       : String(20),
        virtual criticality       : Integer
    };

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity Orders as projection on mp.Orders {
        *,
        virtual orderStatusCriticality   : Integer,
        virtual paymentStatusCriticality : Integer,
        virtual orderCriticality         : Integer,
        virtual paymentCriticality       : Integer,
        virtual fulfillmentCriticality   : Integer
    };

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity OrderItems as projection on mp.OrderItems;

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity OrderStatusHistories as projection on mp.OrderStatusHistories;

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity Payments as projection on mp.Payments {
        *,
        virtual statusCriticality : Integer
    };

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity Shipments as projection on mp.Shipments {
        *,
        virtual statusCriticality : Integer
    };

    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity Reviews as projection on mp.Reviews {
        *,
        virtual statusCriticality : Integer
    };

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity Customers as projection on mp.Customers {
        *,
        virtual statusCriticality : Integer
    };

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity Addresses as projection on mp.Addresses;

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity Wishlists as projection on mp.Wishlists;

    @restrict: [{ grant: '*', to: ['OrderManager', 'Administrator'] }]
    entity WishlistItems as projection on mp.WishlistItems;

    @odata.draft.enabled
    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity Promotions as projection on mp.Promotions;

    @restrict: [{ grant: '*', to: ['ProductManager', 'Administrator'] }]
    entity Coupons as projection on mp.Coupons;

    @requires: ['OrderManager', 'Administrator']
    action fulfillShipment(
        order_ID       : UUID,
        carrier        : String,
        trackingNumber : String
    ) returns Shipments;

    @requires: ['OrderManager', 'Administrator']
    action updateShipmentStatus(
        shipment_ID : UUID,
        status      : String
    ) returns Shipments;

    @requires: ['ProductManager', 'Administrator']
    action moderateReview(
        review_ID : UUID,
        status    : String // 'APPROVED' or 'REJECTED'
    ) returns Reviews;

    @requires: 'Administrator'
    action approveSeller(
        seller_ID : UUID
    ) returns Sellers;

    @readonly
    @restrict: [{ grant: 'READ', to: ['ProductManager', 'OrderManager', 'InventoryManager', 'Administrator'] }]
    entity Brands {
        key brand : String(100);
    }

    @readonly
    @restrict: [{ grant: 'READ', to: ['ProductManager', 'OrderManager', 'InventoryManager', 'Administrator'] }]
    entity OrderStatuses {
        key code        : String(25);
            name        : String(50);
            criticality : Integer;
    }

    @readonly
    @restrict: [{ grant: 'READ', to: ['ProductManager', 'OrderManager', 'InventoryManager', 'Administrator'] }]
    entity PaymentStatuses {
        key code        : String(20);
            name        : String(50);
            criticality : Integer;
    }

    @readonly
    @restrict: [{ grant: 'READ', to: ['ProductManager', 'OrderManager', 'InventoryManager', 'Administrator'] }]
    entity ProductStatuses {
        key code        : String(20);
            name        : String(50);
            criticality : Integer;
    }
}
