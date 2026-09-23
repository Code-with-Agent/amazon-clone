import cds from '@sap/cds';
import { expect } from 'chai';

describe('CartService & Add to Cart Flow', () => {
    const { GET, POST, axios } = cds.test('.');

    let activeOfferId;
    let testProductId;
    let testVariantId;
    let addedCartItemId;

    before(async () => {
        axios.defaults.auth = { username: 'alice', password: '' };
        // Query active offers and products
        const offersRes = await GET('/odata/v4/catalog/ProductOffers');
        expect(offersRes.status).to.equal(200);
        activeOfferId = offersRes.data.value[0].ID;

        const prodRes = await GET('/odata/v4/catalog/Products');
        expect(prodRes.status).to.equal(200);
        testProductId = prodRes.data.value[0].ID;

        const varRes = await GET(`/odata/v4/catalog/Products(${testProductId})/variants`);
        expect(varRes.status).to.equal(200);
        testVariantId = varRes.data.value[0].ID;
    });

    // -------------------------------------------------------------
    // SUCCESS SCENARIOS
    // -------------------------------------------------------------
    it('1. should add item to cart via offer_ID (determines price, checks stock, creates CartItem, recalcs totals)', async () => {
        const res = await POST('/odata/v4/cart/addToCart', {
            offer_ID: activeOfferId,
            quantity: 2
        });

        expect(res.status).to.equal(200);
        const cart = res.data;
        expect(cart).to.have.property('subtotalAmount');
        expect(Number(cart.subtotalAmount)).to.be.greaterThan(0);
        expect(Number(cart.totalAmount)).to.be.greaterThan(0);
        expect(cart.items).to.be.an('array');
        expect(cart.items.length).to.be.greaterThan(0);

        addedCartItemId = cart.items[cart.items.length - 1].ID;
    });

    it('2. should add item to cart via product_ID and variant_ID (determines BuyBox price and checks availability)', async () => {
        const res = await POST('/odata/v4/cart/addToCart', {
            product_ID: testProductId,
            variant_ID: testVariantId,
            quantity: 1
        });

        expect(res.status).to.equal(200);
        const cart = res.data;
        const matchingItem = cart.items.find(i => i.variant_ID === testVariantId);
        expect(matchingItem).to.exist;
        expect(matchingItem.quantity).to.be.greaterThanOrEqual(1);
    });

    it('3. should increment quantity when product already exists in cart and recalculate totals', async () => {
        const resBefore = await POST('/odata/v4/cart/calculateTotals', {});
        const priorItem = resBefore.data.items.find(i => i.variant_ID === testVariantId);
        const priorQty = priorItem ? priorItem.quantity : 0;

        const res = await POST('/odata/v4/cart/addToCart', {
            product_ID: testProductId,
            variant_ID: testVariantId,
            quantity: 2
        });

        expect(res.status).to.equal(200);
        const cart = res.data;
        const updatedItem = cart.items.find(i => i.variant_ID === testVariantId);
        expect(updatedItem.quantity).to.equal(priorQty + 2);
    });

    it('4. should update cart quantity via updateCartQuantity', async () => {
        const res = await POST('/odata/v4/cart/updateCartQuantity', {
            cartItem_ID: addedCartItemId,
            quantity: 4
        });

        expect(res.status).to.equal(200);
        const cart = res.data;
        const item = cart.items.find(i => i.ID === addedCartItemId);
        expect(item).to.exist;
        expect(item.quantity).to.equal(4);
    });

    it('5. should apply a valid coupon and deduct promotional discount', async () => {
        const res = await POST('/odata/v4/cart/applyCoupon', {
            couponCode: 'SAVE10'
        });

        expect(res.status).to.equal(200);
        const cart = res.data;
        expect(Number(cart.discountAmount)).to.be.greaterThan(0);
        expect(Number(cart.totalAmount)).to.be.lessThan(
            Number(cart.subtotalAmount) + Number(cart.taxEstimate) + Number(cart.shippingEstimate)
        );
    });

    it('6. should validate cart successfully when stock is available', async () => {
        const res = await POST('/odata/v4/cart/validateCart', {});
        expect(res.status).to.equal(200);
        expect(res.data.isValid).to.be.true;
        expect(res.data.issues).to.be.empty;
    });

    it('7. should remove item from cart and recalculate totals', async () => {
        const res = await POST('/odata/v4/cart/removeFromCart', {
            cartItem_ID: addedCartItemId
        });

        expect(res.status).to.equal(200);
        const cart = res.data;
        const item = cart.items.find(i => i.ID === addedCartItemId);
        expect(item).to.be.undefined;
    });

    // -------------------------------------------------------------
    // FAILURE & VALIDATION SCENARIOS
    // -------------------------------------------------------------
    it('8. should reject adding to cart with non-existent product ID', async () => {
        try {
            await POST('/odata/v4/cart/addToCart', {
                product_ID: '00000000-0000-0000-0000-000000000000',
                quantity: 1
            });
            expect.fail('Should have rejected with 404');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(404);
        }
    });

    it('9. should reject adding to cart with invalid variant for product', async () => {
        try {
            await POST('/odata/v4/cart/addToCart', {
                product_ID: testProductId,
                variant_ID: '00000000-0000-0000-0000-000000000000',
                quantity: 1
            });
            expect.fail('Should have rejected with 404');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(404);
        }
    });

    it('10. should reject adding quantity exceeding available inventory', async () => {
        try {
            await POST('/odata/v4/cart/addToCart', {
                product_ID: testProductId,
                variant_ID: testVariantId,
                quantity: 999999 // Exceeds available stock
            });
            expect.fail('Should have rejected with 409 Conflict');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(409);
        }
    });

    it('11. should reject invalid coupon code', async () => {
        try {
            await POST('/odata/v4/cart/applyCoupon', {
                couponCode: 'NOT_REAL_COUPON_123'
            });
            expect.fail('Should have rejected with 404');
        } catch (err) {
            expect(err.status || err.response?.status).to.equal(404);
        }
    });
});
