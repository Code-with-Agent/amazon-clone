import cds from '@sap/cds';

export default class CartService extends cds.ApplicationService {
    async init() {
        const {
            Carts, CartItems, ProductOffers, ProductVariants, Products, Customers,
            Coupons, Promotions, Inventories
        } = cds.entities('sap.marketplace');

        // Helper: retrieve or initialize active customer cart
        const getOrCreateCart = async (tx, req) => {
            const userAttrId = req.user?.attr?.id || req.user?.attr?.customerId || req.user?.id;
            let customer = null;
            if (userAttrId) {
                customer = await tx.run(
                    SELECT.one.from(Customers).where({ externalUserId: userAttrId })
                );
                if (!customer) {
                    customer = await tx.run(
                        SELECT.one.from(Customers).where({ ID: userAttrId })
                    );
                }
            }

            const customerId = customer ? customer.ID : null;
            let cart = null;

            if (customerId) {
                cart = await tx.run(
                    SELECT.one.from(Carts).where({ customer_ID: customerId })
                );
            }

            if (!cart) {
                const newCartId = cds.utils.uuid();
                cart = {
                    ID: newCartId,
                    customer_ID: customerId,
                    currency_code: 'USD',
                    subtotalAmount: 0.00,
                    discountAmount: 0.00,
                    shippingEstimate: 0.00,
                    taxEstimate: 0.00,
                    totalAmount: 0.00
                };
                await tx.run(INSERT.into(Carts).entries(cart));
            }

            return cart;
        };

        // Helper: recalculate cart financials
        const recalcCart = async (tx, cartId) => {
            const items = await tx.run(
                SELECT.from(CartItems).where({ cart_ID: cartId })
            );

            let subtotal = 0;
            const activeItems = items.filter(item => !item.isSavedForLater);
            for (const item of activeItems) {
                subtotal += Number(item.extendedPrice);
            }

            const cart = await tx.run(SELECT.one.from(Carts).where({ ID: cartId }));
            let discount = 0;

            if (cart.appliedCoupon_ID) {
                const coupon = await tx.run(
                    SELECT.one.from(Coupons).where({ ID: cart.appliedCoupon_ID })
                );
                if (coupon && coupon.isActive) {
                    const promo = await tx.run(
                        SELECT.one.from(Promotions).where({ ID: coupon.promotion_ID })
                    );
                    if (promo && promo.isActive) {
                        const now = new Date();
                        if (new Date(promo.startDate) <= now && now <= new Date(promo.endDate)) {
                            if (!promo.minOrderValue || subtotal >= Number(promo.minOrderValue)) {
                                if (promo.discountType === 'PERCENTAGE') {
                                    discount = subtotal * (Number(promo.discountValue) / 100);
                                } else if (promo.discountType === 'FIXED_AMOUNT') {
                                    discount = Math.min(Number(promo.discountValue), subtotal);
                                }
                            }
                        }
                    }
                }
            }

            discount = Number(discount.toFixed(2));
            const taxableAmount = Math.max(0, subtotal - discount);
            const shipping = subtotal > 50 || subtotal === 0 ? 0.00 : 9.99;
            const tax = Number((taxableAmount * 0.08).toFixed(2));
            const total = Number((taxableAmount + shipping + tax).toFixed(2));

            await tx.run(
                UPDATE(Carts, cartId).with({
                    subtotalAmount: subtotal.toFixed(2),
                    discountAmount: discount.toFixed(2),
                    shippingEstimate: shipping.toFixed(2),
                    taxEstimate: tax.toFixed(2),
                    totalAmount: total.toFixed(2)
                })
            );

            const updatedCart = await tx.run(SELECT.one.from(Carts).where({ ID: cartId }));
            const updatedItems = await tx.run(SELECT.from(CartItems).where({ cart_ID: cartId }));
            updatedCart.items = updatedItems;
            return updatedCart;
        };

        // -------------------------------------------------------------
        // ACTION: addToCart (Comprehensive 9-Step Real-World Flow)
        // -------------------------------------------------------------
        this.on('addToCart', async (req) => {
            const { product_ID, variant_ID, offer_ID, quantity } = req.data;
            const qty = quantity === undefined ? 1 : Number(quantity);

            if (isNaN(qty) || qty < 1) {
                return req.reject(400, 'Requested quantity must be at least 1');
            }

            const tx = cds.tx(req);

            // Step 1: Validate customer
            const userAttrId = req.user?.attr?.id || req.user?.attr?.customerId || req.user?.id;
            let customer = null;
            if (userAttrId) {
                customer = await tx.run(
                    SELECT.one.from(Customers).where({ externalUserId: userAttrId })
                );
                if (!customer) {
                    customer = await tx.run(
                        SELECT.one.from(Customers).where({ ID: userAttrId })
                    );
                }
            }
            if (!customer) {
                return req.reject(401, 'Customer authentication profile not found');
            }

            // Step 2 & 3: Validate product and variant
            let resolvedVariant;
            let resolvedProduct;
            let resolvedOffer;

            if (offer_ID) {
                resolvedOffer = await tx.run(
                    SELECT.one.from(ProductOffers).where({ ID: offer_ID, isActive: true })
                );
                if (!resolvedOffer) {
                    return req.reject(404, `Active seller offer with ID '${offer_ID}' not found`);
                }
                resolvedVariant = await tx.run(
                    SELECT.one.from(ProductVariants).where({ ID: resolvedOffer.variant_ID, isActive: true })
                );
                if (!resolvedVariant) {
                    return req.reject(404, 'Product variant for this offer is inactive or unavailable');
                }
                resolvedProduct = await tx.run(
                    SELECT.one.from(Products).where({ ID: resolvedVariant.product_ID, status: 'ACTIVE' })
                );
                if (!resolvedProduct) {
                    return req.reject(404, 'Master product is inactive or unavailable');
                }
            } else if (product_ID) {
                resolvedProduct = await tx.run(
                    SELECT.one.from(Products).where({ ID: product_ID, status: 'ACTIVE' })
                );
                if (!resolvedProduct) {
                    return req.reject(404, `Active product with ID '${product_ID}' not found`);
                }

                if (variant_ID) {
                    resolvedVariant = await tx.run(
                        SELECT.one.from(ProductVariants).where({
                            ID: variant_ID,
                            product_ID: product_ID,
                            isActive: true
                        })
                    );
                    if (!resolvedVariant) {
                        return req.reject(404, 'Specified product variant not found or inactive');
                    }
                } else {
                    // Pick the primary active variant
                    resolvedVariant = await tx.run(
                        SELECT.one.from(ProductVariants).where({ product_ID: product_ID, isActive: true })
                    );
                    if (!resolvedVariant) {
                        return req.reject(404, 'No active variants found for this product');
                    }
                }

                // Step 5: Determine current price from winning or lowest active offer
                const offers = await tx.run(
                    SELECT.from(ProductOffers)
                        .where({ variant_ID: resolvedVariant.ID, isActive: true })
                        .orderBy('isBuyBoxWinner desc, price asc')
                );
                if (!offers || offers.length === 0) {
                    return req.reject(404, `No active seller offers found for '${resolvedProduct.title}'`);
                }
                resolvedOffer = offers[0];
            } else {
                return req.reject(400, 'Either offer_ID or product_ID must be provided');
            }

            // Step 4: Check product availability (Never allow overselling)
            const stockRecords = await tx.run(
                SELECT.from(Inventories).where({ variant_ID: resolvedVariant.ID })
            );
            const totalAvailable = stockRecords.reduce(
                (sum, s) => sum + Math.max(0, s.quantityOnHand - s.quantityReserved),
                0
            );

            const cart = await getOrCreateCart(tx, req);

            // Step 6: Check whether the product/variant already exists in cart
            const existingItem = await tx.run(
                SELECT.one.from(CartItems).where({
                    cart_ID: cart.ID,
                    variant_ID: resolvedVariant.ID,
                    isSavedForLater: false
                })
            );

            const currentPrice = Number(resolvedOffer.price);

            if (existingItem) {
                // Step 7: Update quantity if it exists
                const newQty = existingItem.quantity + qty;
                if (newQty > totalAvailable) {
                    return req.reject(
                        409,
                        `Cannot add ${qty} more unit(s). Total requested (${newQty}) exceeds available stock (${totalAvailable}) for '${resolvedProduct.title}'`
                    );
                }
                const newExtPrice = (newQty * currentPrice).toFixed(2);
                await tx.run(
                    UPDATE(CartItems, existingItem.ID).with({
                        offer_ID: resolvedOffer.ID,
                        product_ID: resolvedProduct.ID,
                        quantity: newQty,
                        unitPrice: currentPrice.toFixed(2),
                        extendedPrice: newExtPrice
                    })
                );
            } else {
                // Step 8: Otherwise create CartItem
                if (qty > totalAvailable) {
                    return req.reject(
                        409,
                        `Insufficient stock for '${resolvedProduct.title}' (SKU: ${resolvedVariant.variantSku}). Available: ${totalAvailable}, Requested: ${qty}`
                    );
                }
                const extPrice = (qty * currentPrice).toFixed(2);
                await tx.run(
                    INSERT.into(CartItems).entries({
                        ID: cds.utils.uuid(),
                        cart_ID: cart.ID,
                        offer_ID: resolvedOffer.ID,
                        variant_ID: resolvedVariant.ID,
                        product_ID: resolvedProduct.ID,
                        isSavedForLater: false,
                        quantity: qty,
                        unitPrice: currentPrice.toFixed(2),
                        extendedPrice: extPrice
                    })
                );
            }

            // Step 9: Recalculate cart totals
            return await recalcCart(tx, cart.ID);
        });

        // -------------------------------------------------------------
        // ACTION: removeFromCart
        // -------------------------------------------------------------
        this.on('removeFromCart', async (req) => {
            const { cartItem_ID } = req.data;
            if (!cartItem_ID) return req.reject(400, 'Cart item ID is required');

            const tx = cds.tx(req);
            const item = await tx.run(SELECT.one.from(CartItems).where({ ID: cartItem_ID }));
            if (!item) return req.reject(404, 'Cart item not found');

            const cartId = item.cart_ID;
            await tx.run(DELETE.from(CartItems).where({ ID: cartItem_ID }));

            return await recalcCart(tx, cartId);
        });

        // -------------------------------------------------------------
        // ACTION: updateCartQuantity
        // -------------------------------------------------------------
        this.on('updateCartQuantity', async (req) => {
            const { cartItem_ID, quantity } = req.data;
            if (!cartItem_ID) return req.reject(400, 'Cart item ID is required');

            const tx = cds.tx(req);
            const item = await tx.run(SELECT.one.from(CartItems).where({ ID: cartItem_ID }));
            if (!item) return req.reject(404, 'Cart item not found');

            const qty = Number(quantity);
            if (qty <= 0) {
                await tx.run(DELETE.from(CartItems).where({ ID: cartItem_ID }));
            } else {
                // Check stock availability
                const stockRecords = await tx.run(
                    SELECT.from(Inventories).where({ variant_ID: item.variant_ID })
                );
                const totalAvailable = stockRecords.reduce(
                    (sum, s) => sum + Math.max(0, s.quantityOnHand - s.quantityReserved),
                    0
                );
                if (qty > totalAvailable) {
                    return req.reject(
                        409,
                        `Cannot update quantity to ${qty}. Maximum available stock is ${totalAvailable}`
                    );
                }

                const extPrice = (qty * Number(item.unitPrice)).toFixed(2);
                await tx.run(
                    UPDATE(CartItems, cartItem_ID).with({
                        quantity: qty,
                        extendedPrice: extPrice
                    })
                );
            }

            return await recalcCart(tx, item.cart_ID);
        });

        // -------------------------------------------------------------
        // ACTION: applyCoupon
        // -------------------------------------------------------------
        this.on('applyCoupon', async (req) => {
            const { couponCode } = req.data;
            if (!couponCode || !couponCode.trim()) return req.reject(400, 'Coupon code is required');

            const tx = cds.tx(req);
            const cleanCode = couponCode.trim().toUpperCase();

            const coupon = await tx.run(
                SELECT.one.from(Coupons).where({ code: cleanCode, isActive: true })
            );
            if (!coupon) return req.reject(404, `Coupon code '${couponCode}' is invalid or expired`);

            if (coupon.currentRedemptions >= coupon.maxRedemptions) {
                return req.reject(400, 'Coupon redemption limit has been reached');
            }

            const promo = await tx.run(
                SELECT.one.from(Promotions).where({ ID: coupon.promotion_ID, isActive: true })
            );
            if (!promo) return req.reject(400, 'Promotion associated with this coupon is no longer active');

            const now = new Date();
            if (new Date(promo.startDate) > now || now > new Date(promo.endDate)) {
                return req.reject(400, 'Promotion is outside of its active date period');
            }

            const cart = await getOrCreateCart(tx, req);

            if (promo.minOrderValue && Number(cart.subtotalAmount) < Number(promo.minOrderValue)) {
                return req.reject(
                    400,
                    `Minimum order value of $${promo.minOrderValue} required for this coupon`
                );
            }

            await tx.run(UPDATE(Carts, cart.ID).with({ appliedCoupon_ID: coupon.ID }));
            return await recalcCart(tx, cart.ID);
        });

        // -------------------------------------------------------------
        // ACTION: calculateTotals
        // -------------------------------------------------------------
        this.on('calculateTotals', async (req) => {
            const tx = cds.tx(req);
            const cart = await getOrCreateCart(tx, req);
            return await recalcCart(tx, cart.ID);
        });

        // -------------------------------------------------------------
        // ACTION: validateCart
        // -------------------------------------------------------------
        this.on('validateCart', async (req) => {
            const tx = cds.tx(req);
            const cart = await getOrCreateCart(tx, req);
            const items = await tx.run(SELECT.from(CartItems).where({ cart_ID: cart.ID }));

            const issues = [];
            if (!items || items.length === 0) {
                issues.push('Shopping cart is empty');
            }

            for (const item of items) {
                const stockRecords = await tx.run(
                    SELECT.from(Inventories).where({ variant_ID: item.variant_ID })
                );
                const totalAvailable = stockRecords.reduce(
                    (sum, s) => sum + Math.max(0, s.quantityOnHand - s.quantityReserved),
                    0
                );
                if (totalAvailable < item.quantity) {
                    issues.push(`Insufficient stock for item variant SKU. Available: ${totalAvailable}, Requested: ${item.quantity}`);
                }
            }

            return {
                isValid: issues.length === 0,
                issues: issues
            };
        });

        // -------------------------------------------------------------
        // ACTION: clearCart
        // -------------------------------------------------------------
        this.on('clearCart', async (req) => {
            const tx = cds.tx(req);
            const cart = await getOrCreateCart(tx, req);
            await tx.run(DELETE.from(CartItems).where({ cart_ID: cart.ID }));
            await tx.run(
                UPDATE(Carts, cart.ID).with({
                    appliedCoupon_ID: null,
                    subtotalAmount: 0.00,
                    discountAmount: 0.00,
                    shippingEstimate: 0.00,
                    taxEstimate: 0.00,
                    totalAmount: 0.00
                })
            );
            return true;
        });

        // -------------------------------------------------------------
        // ACTION: saveForLater
        // -------------------------------------------------------------
        this.on('saveForLater', async (req) => {
            const { cartItem_ID } = req.data;
            const tx = cds.tx(req);
            const item = await tx.run(SELECT.one.from(CartItems).where({ ID: cartItem_ID }));
            if (!item) return req.reject(404, 'Cart item not found');
            await tx.run(UPDATE(CartItems, cartItem_ID).with({ isSavedForLater: true }));
            return await recalcCart(tx, item.cart_ID);
        });

        // -------------------------------------------------------------
        // ACTION: moveToCart
        // -------------------------------------------------------------
        this.on('moveToCart', async (req) => {
            const { cartItem_ID } = req.data;
            const tx = cds.tx(req);
            const item = await tx.run(SELECT.one.from(CartItems).where({ ID: cartItem_ID }));
            if (!item) return req.reject(404, 'Cart item not found');
            await tx.run(UPDATE(CartItems, cartItem_ID).with({ isSavedForLater: false }));
            return await recalcCart(tx, item.cart_ID);
        });

        return super.init();
    }
}
