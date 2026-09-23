namespace sap.marketplace;

using { cuid, managed, Currency, Country } from '@sap/cds/common';

/* -------------------------------------------------------------
 * ENUM TYPE DEFINITIONS
 * ------------------------------------------------------------- */
type CustomerStatus       : String(20) enum { ACTIVE; SUSPENDED; LOCKED; };
type AddressType          : String(20) enum { SHIPPING; BILLING; WAREHOUSE; };
type ProductStatus        : String(20) enum { DRAFT; ACTIVE; DISCONTINUED; };
type SellerStatus         : String(20) enum { PENDING; APPROVED; SUSPENDED; };
type OfferCondition       : String(20) enum { NEW; REFURBISHED; USED_LIKE_NEW; };
type ReservationStatus    : String(20) enum { RESERVED; COMMITTED; RELEASED; EXPIRED; };
type OrderStatus          : String(25) enum { PENDING_PAYMENT; CONFIRMED; PROCESSING; SHIPPED; DELIVERED; CANCELLED; RETURNED; PAYMENT_FAILED; };
type PaymentStatus        : String(20) enum { UNPAID; AUTHORIZED; PAID; REFUNDED; FAILED; };
type FulfillmentStatus    : String(20) enum { UNFULFILLED; PARTIAL; FULFILLED; RETURNED; };
type OrderItemStatus      : String(20) enum { ORDERED; SHIPPED; DELIVERED; CANCELLED; RETURNED; };
type PaymentMethod        : String(30) enum { CREDIT_CARD; PAYPAL; APPLE_PAY; BANK_TRANSFER; };
type PaymentRecordStatus  : String(20) enum { INITIATED; AUTHORIZED; CAPTURED; FAILED; REFUNDED; };
type ShipmentStatus       : String(25) enum { PREPARING; DISPATCHED; IN_TRANSIT; OUT_FOR_DELIVERY; DELIVERED; RETURNED; };
type ReviewStatus         : String(20) enum { PENDING_MODERATION; APPROVED; REJECTED; };
type DiscountType         : String(20) enum { PERCENTAGE; FIXED_AMOUNT; };
type NotificationChannel  : String(20) enum { IN_APP; EMAIL; SMS; PUSH; };

/* -------------------------------------------------------------
 * 1. IDENTITY & CUSTOMER DOMAIN
 * ------------------------------------------------------------- */
@assert.unique: { email: [email], externalUserId: [externalUserId] }
entity Customers : cuid, managed {
    externalUserId    : String(128);
    firstName         : String(60);
    lastName          : String(60);
    email             : String(255);
    phoneNumber       : String(30);
    status            : CustomerStatus default 'ACTIVE';
    isEmailVerified   : Boolean default false;
    preferredCurrency : Currency default 'USD';
    preferredLanguage : String(5) default 'en';
    
    addresses         : Composition of many Addresses on addresses.customer = $self;
    cart              : Association to one Carts on cart.customer = $self;
    wishlist          : Association to one Wishlists on wishlist.customer = $self;
    orders            : Association to many Orders on orders.customer = $self;
    reviews           : Association to many Reviews on reviews.customer = $self;
    notifications     : Association to many Notifications on notifications.customer = $self;
}

entity Addresses : cuid, managed {
    customer             : Association to Customers;
    type                 : AddressType default 'SHIPPING';
    isDefault            : Boolean default false;
    fullName             : String(120);
    streetName           : String(150);
    apartmentSuite       : String(50);
    city                 : String(80);
    stateProvince        : String(80);
    postalCode           : String(20);
    country              : Country;
    phone                : String(30);
    deliveryInstructions : String(500);
}

/* -------------------------------------------------------------
 * 2. PRODUCT CATALOG & SELLER DOMAIN
 * ------------------------------------------------------------- */
@assert.unique: { code: [code] }
entity Categories : cuid, managed {
    code         : String(50);
    name         : localized String(100);
    description  : localized String(500);
    parent       : Association to Categories;
    level        : Integer default 1;
    displayOrder : Integer default 0;
    imageUrl     : String(1000);
    isActive     : Boolean default true;

    children     : Composition of many Categories on children.parent = $self;
    products     : Association to many Products on products.category = $self;
}

@assert.unique: { sku: [sku] }
entity Products : cuid, managed {
    sku           : String(60);
    brand         : String(100);
    title         : localized String(255);
    description   : localized LargeString;
    category      : Association to Categories;
    status        : ProductStatus default 'ACTIVE';
    averageRating : Decimal(3,2) default 0.00;
    reviewCount   : Integer default 0;
    isFeatured    : Boolean default false;

    variants      : Composition of many ProductVariants on variants.product = $self;
    images        : Composition of many ProductImages on images.product = $self;
    reviews       : Association to many Reviews on reviews.product = $self;
}

@assert.unique: { variantSku: [variantSku] }
entity ProductVariants : cuid, managed {
    product      : Association to Products;
    variantSku   : String(80);
    gtinEan      : String(14);
    attributes   : LargeString; // JSON string e.g. {"color":"Black","storage":"256GB"}
    weightKg     : Decimal(8,3);
    dimensionsCm : String(50);
    isActive     : Boolean default true;

    offers       : Composition of many ProductOffers on offers.variant = $self;
    inventories  : Association to many Inventories on inventories.variant = $self;
}

entity ProductImages : cuid {
    product      : Association to Products;
    mediaUrl     : String(1000);
    altText      : String(255);
    displayOrder : Integer default 0;
    isHero       : Boolean default false;
}

@assert.unique: { externalSellerId: [externalSellerId], storeName: [storeName] }
entity Sellers : cuid, managed {
    externalSellerId : String(128);
    storeName        : String(100);
    legalEntity      : String(150);
    taxId            : String(50);
    contactEmail     : String(255);
    rating           : Decimal(3,2) default 5.00;
    status           : SellerStatus default 'PENDING';
    commissionRate   : Decimal(5,2) default 12.50;

    offers           : Association to many ProductOffers on offers.seller = $self;
    warehouses       : Association to many Warehouses on warehouses.seller = $self;
}

entity ProductOffers : cuid, managed {
    variant        : Association to ProductVariants;
    seller         : Association to Sellers;
    price          : Decimal(15,2);
    currency       : Currency default 'USD';
    originalPrice  : Decimal(15,2);
    condition      : OfferCondition default 'NEW';
    leadTimeDays   : Integer default 1;
    isBuyBoxWinner : Boolean default false;
    isActive       : Boolean default true;
}

/* -------------------------------------------------------------
 * 3. INVENTORY & WAREHOUSE LOGISTICS
 * ------------------------------------------------------------- */
@assert.unique: { code: [code] }
entity Warehouses : cuid, managed {
    code        : String(20);
    name        : String(100);
    seller      : Association to Sellers; // null if platform fulfillment warehouse
    address     : Association to Addresses;
    isActive    : Boolean default true;

    inventories : Association to many Inventories on inventories.warehouse = $self;
}

entity Inventories : cuid, managed {
    variant          : Association to ProductVariants;
    warehouse        : Association to Warehouses;
    quantityOnHand   : Integer default 0;
    quantityReserved : Integer default 0;
    reorderThreshold : Integer default 10;

    virtual availableQuantity : Integer;
    virtual reservedQuantity  : Integer;

    reservations     : Composition of many InventoryReservations on reservations.inventory = $self;
}

entity InventoryReservations : cuid, managed {
    inventory : Association to Inventories;
    order     : Association to Orders;
    quantity  : Integer;
    status    : ReservationStatus default 'RESERVED';
    expiresAt : Timestamp;
}

/* -------------------------------------------------------------
 * 4. SHOPPING CART & ENGAGEMENT
 * ------------------------------------------------------------- */
entity Carts : cuid, managed {
    customer         : Association to Customers;
    guestToken       : String(64);
    appliedCoupon    : Association to Coupons;
    currency         : Currency default 'USD';
    subtotalAmount   : Decimal(15,2) default 0.00;
    discountAmount   : Decimal(15,2) default 0.00;
    shippingEstimate : Decimal(15,2) default 0.00;
    taxEstimate      : Decimal(15,2) default 0.00;
    totalAmount      : Decimal(15,2) default 0.00;

    items            : Composition of many CartItems on items.cart = $self;
}

entity CartItems : cuid, managed {
    cart            : Association to Carts;
    offer           : Association to ProductOffers;
    variant         : Association to ProductVariants;
    product         : Association to Products;
    isSavedForLater : Boolean default false;
    quantity        : Integer default 1;
    unitPrice       : Decimal(15,2);
    extendedPrice   : Decimal(15,2);
}

entity Wishlists : cuid, managed {
    customer : Association to Customers;
    title    : String(100) default 'My Wishlist';
    isPublic : Boolean default false;

    items    : Composition of many WishlistItems on items.wishlist = $self;
}

entity WishlistItems : cuid, managed {
    wishlist    : Association to Wishlists;
    product     : Association to Products;
    variant     : Association to ProductVariants;
    targetPrice : Decimal(15,2);
}

/* -------------------------------------------------------------
 * 5. SALES ORDER & FULFILLMENT DOMAIN
 * ------------------------------------------------------------- */
@assert.unique: { orderNumber: [orderNumber] }
entity Orders : cuid, managed {
    orderNumber        : String(32);
    customer           : Association to Customers;
    shippingAddress    : Association to Addresses;
    billingAddress     : Association to Addresses;
    status             : OrderStatus default 'PENDING_PAYMENT';
    paymentStatus      : PaymentStatus default 'UNPAID';
    fulfillmentStatus  : FulfillmentStatus default 'UNFULFILLED';
    currency           : Currency default 'USD';
    subtotal           : Decimal(15,2);
    discount           : Decimal(15,2) default 0.00;
    shippingCost       : Decimal(15,2) default 0.00;
    taxAmount          : Decimal(15,2);
    totalAmount        : Decimal(15,2);
    cancellationReason : String(255);
    rmaNumber          : String(50);
    returnReason       : String(255);

    items              : Composition of many OrderItems on items.order = $self;
    history            : Composition of many OrderStatusHistories on history.order = $self;
    payment            : Association to one Payments on payment.order = $self;
    shipments          : Association to many Shipments on shipments.order = $self;
}

entity OrderItems : cuid, managed {
    order        : Association to Orders;
    offer        : Association to ProductOffers;
    seller       : Association to Sellers;
    variant      : Association to ProductVariants;
    productTitle : String(255);
    variantSku   : String(80);
    quantity     : Integer;
    unitPrice    : Decimal(15,2);
    taxRate      : Decimal(5,2);
    lineTotal    : Decimal(15,2);
    status       : OrderItemStatus default 'ORDERED';
}

entity OrderStatusHistories : cuid {
    order     : Association to Orders;
    oldStatus : String(25);
    newStatus : String(25);
    changedAt : Timestamp;
    changedBy : String(255);
    notes     : String(500);
}

entity Payments : cuid, managed {
    order                : Association to Orders;
    paymentMethod        : PaymentMethod;
    paymentProvider      : String(30);
    transactionReference : String(120);
    amount               : Decimal(15,2);
    currency             : Currency default 'USD';
    status               : PaymentRecordStatus default 'INITIATED';
    rawGatewayResponse   : LargeString;
}

entity Shipments : cuid, managed {
    order          : Association to Orders;
    warehouse      : Association to Warehouses;
    carrier        : String(60);
    trackingNumber : String(100);
    trackingUrl    : String(1000);
    status         : ShipmentStatus default 'PREPARING';
    shippedAt      : Timestamp;
    deliveredAt    : Timestamp;
}

/* -------------------------------------------------------------
 * 6. MARKETING, RATING & NOTIFICATIONS
 * ------------------------------------------------------------- */
entity Reviews : cuid, managed {
    product            : Association to Products;
    customer           : Association to Customers;
    rating             : Integer @assert.range: [1, 5];
    headline           : String(120);
    comment            : LargeString;
    isVerifiedPurchase : Boolean default false;
    helpfulVotes       : Integer default 0;
    status             : ReviewStatus default 'APPROVED';

    votes              : Composition of many ReviewVotes on votes.review = $self;
}

@assert.unique: { reviewUser: [review, customer] }
entity ReviewVotes : cuid {
    review    : Association to Reviews;
    customer  : Association to Customers;
    isHelpful : Boolean;
}

entity Promotions : cuid, managed {
    name          : String(100);
    discountType  : DiscountType;
    discountValue : Decimal(10,2);
    minOrderValue : Decimal(15,2);
    startDate     : Timestamp;
    endDate       : Timestamp;
    isActive      : Boolean default true;

    coupons       : Composition of many Coupons on coupons.promotion = $self;
}

@assert.unique: { code: [code] }
entity Coupons : cuid, managed {
    promotion          : Association to Promotions;
    code               : String(30);
    maxRedemptions     : Integer default 1000;
    currentRedemptions : Integer default 0;
    perUserLimit       : Integer default 1;
    isActive           : Boolean default true;

    usages             : Association to many CouponUsages on usages.coupon = $self;
}

entity CouponUsages : cuid, managed {
    coupon   : Association to Coupons;
    customer : Association to Customers;
    order    : Association to Orders;
    usedAt   : Timestamp;
}

entity Notifications : cuid, managed {
    customer : Association to Customers;
    title    : String(120);
    message  : String(500);
    channel  : NotificationChannel default 'IN_APP';
    linkUrl  : String(500);
    isRead   : Boolean default false;
}
