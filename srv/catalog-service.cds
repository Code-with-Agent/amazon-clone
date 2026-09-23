using { sap.marketplace as mp } from '../db/schema';

@path: '/odata/v4/catalog'
@requires: 'any'
service CatalogService {

    @readonly
    entity Categories as projection on mp.Categories {
        ID,
        code,
        name,
        description,
        level,
        displayOrder,
        imageUrl,
        parent,
        children : redirected to Categories,
        products : redirected to Products
    } where isActive = true;

    @readonly
    entity Products as projection on mp.Products {
        ID,
        sku,
        brand,
        title,
        description,
        averageRating,
        reviewCount,
        isFeatured,
        status,
        category : redirected to Categories,
        variants : redirected to ProductVariants,
        images   : redirected to ProductImages,
        reviews  : redirected to Reviews
    } where status = 'ACTIVE';

    @readonly
    entity ProductVariants as projection on mp.ProductVariants {
        ID,
        variantSku,
        gtinEan,
        attributes,
        weightKg,
        dimensionsCm,
        isActive,
        product : redirected to Products,
        offers  : redirected to ProductOffers
    } where isActive = true;

    @readonly
    entity ProductImages as projection on mp.ProductImages;

    @readonly
    entity ProductOffers as projection on mp.ProductOffers {
        ID,
        price,
        currency,
        originalPrice,
        condition,
        leadTimeDays,
        isBuyBoxWinner,
        isActive,
        variant : redirected to ProductVariants,
        seller  : redirected to SellerProfiles
    } where isActive = true;

    @readonly
    entity SellerProfiles as projection on mp.Sellers {
        ID,
        storeName,
        rating,
        status
    } where status = 'APPROVED';

    @readonly
    entity Reviews as projection on mp.Reviews {
        ID,
        rating,
        headline,
        comment,
        isVerifiedPurchase,
        helpfulVotes,
        createdAt,
        customer.firstName as authorName,
        product : redirected to Products
    } where status = 'APPROVED';

    // Actions requiring Customer or Administrator role
    @requires: ['Customer', 'Administrator']
    action submitReview(
        product_ID : UUID,
        rating     : Integer,
        headline   : String,
        comment    : String
    ) returns Reviews;

    @requires: ['Customer', 'Administrator']
    action markReviewHelpful(
        review_ID : UUID,
        isHelpful : Boolean
    ) returns Integer;
}
