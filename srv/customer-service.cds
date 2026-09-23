using { sap.marketplace as mp } from '../db/schema';

@path: '/odata/v4/customer'
@requires: ['Customer', 'Administrator']
service CustomerService {

    @restrict: [{ grant: '*', to: ['Customer', 'Administrator'] }]
    entity Profile as projection on mp.Customers;

    @restrict: [{ grant: '*', to: ['Customer', 'Administrator'] }]
    entity Addresses as projection on mp.Addresses;

    @restrict: [{ grant: '*', to: ['Customer', 'Administrator'] }]
    entity Wishlists as projection on mp.Wishlists;

    @restrict: [{ grant: '*', to: ['Customer', 'Administrator'] }]
    entity WishlistItems as projection on mp.WishlistItems {
        *,
        wishlist : redirected to Wishlists,
        product  : redirected to Products,
        variant  : redirected to ProductVariants
    };

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'Administrator'] }]
    entity Products as projection on mp.Products {
        *,
        variants : redirected to ProductVariants,
        images   : redirected to ProductImages
    };

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'Administrator'] }]
    entity ProductVariants as projection on mp.ProductVariants {
        *,
        product : redirected to Products
    };

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'Administrator'] }]
    entity ProductImages as projection on mp.ProductImages;

    @restrict: [{ grant: '*', to: ['Customer', 'Administrator'] }]
    entity Notifications as projection on mp.Notifications;

    action addToWishlist(
        product_ID : UUID,
        variant_ID : UUID
    ) returns WishlistItems;

    action removeFromWishlist(
        wishlistItem_ID : UUID
    ) returns Boolean;

    action markNotificationAsRead(
        notification_ID : UUID
    ) returns Boolean;
}
