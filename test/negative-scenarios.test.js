import cds from '@sap/cds';
import { expect } from 'chai';

describe('Negative, Error & Boundary Test Scenarios', () => {
    const { GET, POST, axios } = cds.test('.');

    let validProductId;
    let validVariantId;
    let validOfferId;

    before(async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        const prodRes = await GET('/odata/v4/catalog/Products?$expand=variants($expand=offers)');
        expect(prodRes.status).to.equal(200);

        const firstProduct = prodRes.data.value[0];
        validProductId = firstProduct.ID;
        validVariantId = firstProduct.variants[0].ID;
        validOfferId = firstProduct.variants[0].offers[0].ID;

        // Clear customer cart
        await POST('/odata/v4/cart/clearCart', {});
    });

    // -------------------------------------------------------------
    // 1. INSUFFICIENT INVENTORY
    // -------------------------------------------------------------
    describe('1. Insufficient Inventory Handling', () => {
        it('should reject adding item to cart with quantity exceeding warehouse availability', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/cart/addToCart', {
                    product_ID: validProductId,
                    variant_ID: validVariantId,
                    quantity: 999999
                });
                expect.fail('Should have rejected exceeding stock with 409 Conflict');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(409);
            }
        });

        it('should reject updating cart item quantity beyond available stock', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            // Add 1 valid item first
            const addRes = await POST('/odata/v4/cart/addToCart', {
                offer_ID: validOfferId,
                quantity: 1
            });
            const cartItem = addRes.data.items[0];

            try {
                await POST('/odata/v4/cart/updateCartQuantity', {
                    cartItem_ID: cartItem.ID,
                    quantity: 999999
                });
                expect.fail('Should have rejected with 409 Conflict');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(409);
            }
        });

        it('should reject InventoryService reservation request exceeding available inventory', async () => {
            axios.defaults.auth = { username: 'admin', password: '' };

            try {
                await POST('/odata/v4/inventory/reserveInventory', {
                    order_ID: null,
                    items: [
                        { variant_ID: validVariantId, quantity: 999999 }
                    ]
                });
                expect.fail('Should have rejected with 409 Conflict');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(409);
            }
        });
    });

    // -------------------------------------------------------------
    // 2. INVALID COUPON
    // -------------------------------------------------------------
    describe('2. Invalid Coupon Validation', () => {
        it('should reject non-existent coupon code with 404', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/cart/applyCoupon', {
                    couponCode: 'DOES_NOT_EXIST_XYZ'
                });
                expect.fail('Should have rejected invalid coupon with 404');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(404);
            }
        });

        it('should reject blank or empty coupon code with 400', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/cart/applyCoupon', {
                    couponCode: '   '
                });
                expect.fail('Should have rejected empty coupon with 400');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(400);
            }
        });
    });

    // -------------------------------------------------------------
    // 3. FAILED PAYMENT SIMULATION
    // -------------------------------------------------------------
    describe('3. Payment Failure Handling', () => {
        it('should handle simulated payment failure, mark order PAYMENT_FAILED, and release inventory hold', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            // Ensure cart has 1 item
            await POST('/odata/v4/cart/clearCart', {});
            await POST('/odata/v4/cart/addToCart', {
                offer_ID: validOfferId,
                quantity: 1
            });

            // Checkout with simulateOutcome: 'FAIL'
            const checkoutRes = await POST('/odata/v4/order/checkout', {
                paymentMethod: 'CREDIT_CARD',
                simulateOutcome: 'FAIL'
            });

            expect(checkoutRes.status).to.equal(200);
            expect(checkoutRes.data.status).to.equal('PAYMENT_FAILED');
            expect(checkoutRes.data.paymentStatus).to.equal('FAILED');

            // Verify order state
            const orderRes = await GET(`/odata/v4/order/Orders(${checkoutRes.data.order_ID})`);
            expect(orderRes.data.status).to.equal('PAYMENT_FAILED');
            expect(orderRes.data.paymentStatus).to.equal('FAILED');

            // Verify inventory holds were released
            const { InventoryReservations } = cds.entities('sap.marketplace');
            const reservations = await cds.run(
                SELECT.from(InventoryReservations).where({ order_ID: checkoutRes.data.order_ID })
            );
            expect(reservations.length).to.be.greaterThan(0);
            for (const r of reservations) {
                expect(r.status).to.equal('RELEASED');
            }
        });
    });

    // -------------------------------------------------------------
    // 4. UNAUTHORIZED ACCESS
    // -------------------------------------------------------------
    describe('4. Unauthorized Access Rejections', () => {
        it('should reject unauthenticated call to checkout with 401 Unauthorized', async () => {
            axios.defaults.auth = undefined;

            try {
                await POST('/odata/v4/order/checkout', {
                    paymentMethod: 'CREDIT_CARD'
                });
                expect.fail('Should have rejected with 401');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(401);
            }
        });

        it('should reject customer trying to access AdminService with 403 Forbidden', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await GET('/odata/v4/admin/Products');
                expect.fail('Should have rejected with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should reject customer trying to approve sellers with 403 Forbidden', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/admin/approveSeller', {
                    seller_ID: 'sel00000-0000-0000-0000-000000000001'
                });
                expect.fail('Should have rejected with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });

        it('should reject customer trying to cancel someone else order with 403 Forbidden', async () => {
            axios.defaults.auth = { username: 'bob_customer', password: '' };

            try {
                // ord00000-0000-0000-0000-000000000002 belongs to alice, not bob
                await POST('/odata/v4/order/cancelOrder', {
                    order_ID: 'ord00000-0000-0000-0000-000000000002',
                    reason: 'Unauthorized cancel attempt'
                });
                expect.fail('Should have rejected cross-customer cancellation with 403');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(403);
            }
        });
    });

    // -------------------------------------------------------------
    // 5. INVALID PRODUCT OR VARIANT
    // -------------------------------------------------------------
    describe('5. Invalid Product and Variant Rejection', () => {
        it('should reject adding non-existent product UUID to cart with 404', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/cart/addToCart', {
                    product_ID: '00000000-0000-0000-0000-000000000000',
                    quantity: 1
                });
                expect.fail('Should have rejected non-existent product with 404');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(404);
            }
        });

        it('should reject adding product with mismatched variant UUID with 404', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/cart/addToCart', {
                    product_ID: validProductId,
                    variant_ID: '00000000-0000-0000-0000-000000000000',
                    quantity: 1
                });
                expect.fail('Should have rejected mismatched variant with 404');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(404);
            }
        });

        it('should reject adding with quantity less than 1 with 400', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/cart/addToCart', {
                    offer_ID: validOfferId,
                    quantity: 0
                });
                expect.fail('Should have rejected zero quantity with 400');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(400);
            }
        });
    });

    // -------------------------------------------------------------
    // 6. EMPTY CART CHECKOUT
    // -------------------------------------------------------------
    describe('6. Empty Cart Checkout Rejection', () => {
        it('should report isValid: false when validating an empty cart', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            await POST('/odata/v4/cart/clearCart', {});
            const valRes = await POST('/odata/v4/cart/validateCart', {});
            expect(valRes.status).to.equal(200);
            expect(valRes.data.isValid).to.be.false;
            expect(valRes.data.issues).to.include('Shopping cart is empty');
        });

        it('should reject checkout on empty cart with 400 Bad Request', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            await POST('/odata/v4/cart/clearCart', {});
            try {
                await POST('/odata/v4/order/checkout', {
                    paymentMethod: 'CREDIT_CARD'
                });
                expect.fail('Should have rejected checkout on empty cart with 400');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(400);
            }
        });
    });

    // -------------------------------------------------------------
    // 7. ORDER RETURN & CANCELLATION CONSTRAINTS
    // -------------------------------------------------------------
    describe('7. Order Return & Cancellation State Constraints', () => {
        it('should reject cancelling an order that has already been delivered with 400', async () => {
            axios.defaults.auth = { username: 'admin', password: '' };

            try {
                await POST('/odata/v4/order/cancelOrder', {
                    order_ID: 'ord00000-0000-0000-0000-000000000001', // Pre-delivered order
                    reason: 'Cannot cancel delivered order'
                });
                expect.fail('Should have rejected cancellation with 400');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(400);
            }
        });

        it('should reject returning an order that is not in DELIVERED status with 400', async () => {
            axios.defaults.auth = { username: 'admin', password: '' };

            try {
                // ord00000-0000-0000-0000-000000000002 is CONFIRMED, not DELIVERED
                await POST('/odata/v4/order/returnOrder', {
                    order_ID: 'ord00000-0000-0000-0000-000000000002',
                    reason: 'Return on unfulfilled order'
                });
                expect.fail('Should have rejected return with 400');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(400);
            }
        });
    });

    // -------------------------------------------------------------
    // 8. PRODUCT REVIEW BOUNDARY CONSTRAINTS
    // -------------------------------------------------------------
    describe('8. Product Review Constraints', () => {
        it('should reject review with rating greater than 5 with 400', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/catalog/submitReview', {
                    product_ID: validProductId,
                    rating: 10, // Invalid > 5
                    headline: 'Impossible score'
                });
                expect.fail('Should have rejected invalid rating with 400');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(400);
            }
        });

        it('should reject review with rating less than 1 with 400', async () => {
            axios.defaults.auth = { username: 'alice', password: '' };

            try {
                await POST('/odata/v4/catalog/submitReview', {
                    product_ID: validProductId,
                    rating: 0, // Invalid < 1
                    headline: 'Zero rating'
                });
                expect.fail('Should have rejected invalid rating with 400');
            } catch (err) {
                expect(err.status || err.response?.status).to.equal(400);
            }
        });
    });
});
