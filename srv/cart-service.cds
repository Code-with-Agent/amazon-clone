using { sap.marketplace as mp } from '../db/schema';

@path: '/odata/v4/cart'
@requires: ['Customer', 'Administrator']
service CartService {

    @restrict: [{ grant: '*', to: ['Customer', 'Administrator'] }]
    entity ActiveCart as projection on mp.Carts;

    @restrict: [{ grant: '*', to: ['Customer', 'Administrator'] }]
    entity CartItems as projection on mp.CartItems {
        *,
        cart    : redirected to ActiveCart,
        product : redirected to Products,
        variant : redirected to ProductVariants,
        offer   : redirected to ProductOffers
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
        product : redirected to Products,
        offers  : redirected to ProductOffers
    };

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'Administrator'] }]
    entity ProductOffers as projection on mp.ProductOffers;

    @readonly
    @restrict: [{ grant: 'READ', to: ['Customer', 'Administrator'] }]
    entity ProductImages as projection on mp.ProductImages;

    type ValidationResult {
        isValid : Boolean;
        issues  : array of String;
    };

    action addToCart(
        product_ID : UUID,
        variant_ID : UUID,
        offer_ID   : UUID,
        quantity   : Integer
    ) returns ActiveCart;

    action removeFromCart(
        cartItem_ID : UUID
    ) returns ActiveCart;

    action updateCartQuantity(
        cartItem_ID : UUID,
        quantity    : Integer
    ) returns ActiveCart;

    action applyCoupon(
        couponCode : String
    ) returns ActiveCart;

    action calculateTotals() returns ActiveCart;

    action validateCart() returns ValidationResult;

    action clearCart() returns Boolean;

    action saveForLater(
        cartItem_ID : UUID
    ) returns ActiveCart;

    action moveToCart(
        cartItem_ID : UUID
    ) returns ActiveCart;
}
