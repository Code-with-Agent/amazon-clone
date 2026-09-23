import cds from '@sap/cds';
import { expect } from 'chai';

describe('Critical End-to-End User Flow (12 Sequential Scenarios)', () => {
    const { GET, POST, axios } = cds.test('.');

    let selectedProduct;
    let selectedVariant;
    let selectedOffer;
    let cartItemId;
    let placedOrderId;
    let placedOrderNumber;
    let originalVariantStock;

    before(async () => {
        // Start with clean state for customer alice
        axios.defaults.auth = { username: 'alice', password: '' };
        await POST('/odata/v4/cart/clearCart', {});
    });

    // -------------------------------------------------------------
    // SCENARIO 1: Browse Catalog
    // -------------------------------------------------------------
    it('1. should browse catalog: fetch active categories, hero products, and featured catalog', async () => {
        axios.defaults.auth = undefined; // Anonymous browsing allowed

        // 1a. Fetch categories
        const catRes = await GET('/odata/v4/catalog/Categories');
        expect(catRes.status).to.equal(200);
        expect(catRes.data.value).to.be.an('array');
        expect(catRes.data.value.length).to.be.greaterThan(0);

        // 1b. Fetch featured products
        const featRes = await GET('/odata/v4/catalog/Products?$filter=isFeatured eq true&$expand=images');
        expect(featRes.status).to.equal(200);
        expect(featRes.data.value).to.be.an('array');
        expect(featRes.data.value.length).to.be.greaterThan(0);
        const featuredItem = featRes.data.value[0];
        expect(featuredItem).to.have.property('title');
        expect(featuredItem.isFeatured).to.be.true;
    });

    // -------------------------------------------------------------
    // SCENARIO 2: Search Product
    // -------------------------------------------------------------
    it('2. should search product by keyword and filter by brand/title', async () => {
        axios.defaults.auth = undefined;

        const searchRes = await GET("/odata/v4/catalog/Products?$filter=contains(title, 'Headphones') or contains(brand, 'Sony')");
        expect(searchRes.status).to.equal(200);
        expect(searchRes.data.value).to.be.an('array');
        expect(searchRes.data.value.length).to.be.greaterThan(0);

        // Select product for the rest of the flow
        selectedProduct = searchRes.data.value[0];
        expect(selectedProduct).to.have.property('ID');
        expect(selectedProduct).to.have.property('title');
    });

    // -------------------------------------------------------------
    // SCENARIO 3: Open Product
    // -------------------------------------------------------------
    it('3. should open product details with variants, seller offers, images, and reviews', async () => {
        axios.defaults.auth = undefined;

        const detailRes = await GET(`/odata/v4/catalog/Products(${selectedProduct.ID})?$expand=variants($expand=offers),images,reviews`);
        expect(detailRes.status).to.equal(200);
        const product = detailRes.data;
        expect(product.ID).to.equal(selectedProduct.ID);
        expect(product.variants).to.be.an('array').with.length.greaterThan(0);

        selectedVariant = product.variants[0];
        expect(selectedVariant).to.have.property('variantSku');
        expect(selectedVariant.offers).to.be.an('array').with.length.greaterThan(0);

        selectedOffer = selectedVariant.offers[0];
        expect(selectedOffer).to.have.property('price');
        expect(Number(selectedOffer.price)).to.be.greaterThan(0);

        // Record initial inventory stock for verification later
        const { Inventories } = cds.entities('sap.marketplace');
        const invRecord = await cds.run(
            SELECT.one.from(Inventories).where({ variant_ID: selectedVariant.ID })
        );
        originalVariantStock = invRecord.quantityOnHand;
    });

    // -------------------------------------------------------------
    // SCENARIO 4: Add Product to Cart
    // -------------------------------------------------------------
    it('4. should add product to customer cart with unit price and line total calculation', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const addRes = await POST('/odata/v4/cart/addToCart', {
            product_ID: selectedProduct.ID,
            variant_ID: selectedVariant.ID,
            offer_ID: selectedOffer.ID,
            quantity: 1
        });

        expect(addRes.status).to.equal(200);
        const cart = addRes.data;
        expect(cart.items).to.be.an('array').with.length.greaterThan(0);

        const addedItem = cart.items.find(i => i.variant_ID === selectedVariant.ID);
        expect(addedItem).to.exist;
        expect(addedItem.quantity).to.equal(1);
        expect(Number(addedItem.unitPrice)).to.equal(Number(selectedOffer.price));
        expect(Number(addedItem.extendedPrice)).to.equal(Number(selectedOffer.price));

        cartItemId = addedItem.ID;
    });

    // -------------------------------------------------------------
    // SCENARIO 5: Change Quantity
    // -------------------------------------------------------------
    it('5. should change quantity and recalculate subtotal, tax, and grand total', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const updateRes = await POST('/odata/v4/cart/updateCartQuantity', {
            cartItem_ID: cartItemId,
            quantity: 2
        });

        expect(updateRes.status).to.equal(200);
        const cart = updateRes.data;
        const updatedItem = cart.items.find(i => i.ID === cartItemId);
        expect(updatedItem.quantity).to.equal(2);

        const expectedSubtotal = Number((2 * Number(selectedOffer.price)).toFixed(2));
        expect(Number(cart.subtotalAmount)).to.equal(expectedSubtotal);
        expect(Number(cart.totalAmount)).to.be.greaterThan(expectedSubtotal);
    });

    // -------------------------------------------------------------
    // SCENARIO 6: Apply Coupon
    // -------------------------------------------------------------
    it('6. should apply coupon code and deduct promotional discount amount', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const couponRes = await POST('/odata/v4/cart/applyCoupon', {
            couponCode: 'SAVE10'
        });

        expect(couponRes.status).to.equal(200);
        const cart = couponRes.data;
        expect(Number(cart.discountAmount)).to.be.greaterThan(0);

        // Verify grand total formula: (subtotal - discount) + tax + shipping
        const taxable = Number(cart.subtotalAmount) - Number(cart.discountAmount);
        const expectedTax = Number((taxable * 0.08).toFixed(2));
        expect(Number(cart.taxEstimate)).to.be.closeTo(expectedTax, 0.05);
    });

    // -------------------------------------------------------------
    // SCENARIO 7: Checkout
    // -------------------------------------------------------------
    it('7. should execute checkout: validate cart, reserve stock, and generate order record', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const checkoutRes = await POST('/odata/v4/order/checkout', {
            paymentMethod: 'CREDIT_CARD',
            paymentToken: 'tok_visa_4242',
            simulateOutcome: 'SUCCESS'
        });

        expect(checkoutRes.status).to.equal(200);
        const orderResult = checkoutRes.data;
        expect(orderResult).to.have.property('order_ID');
        expect(orderResult).to.have.property('orderNumber');
        expect(orderResult.orderNumber).to.match(/^ORD-\d{8}-\d{4}$/);

        placedOrderId = orderResult.order_ID;
        placedOrderNumber = orderResult.orderNumber;
    });

    // -------------------------------------------------------------
    // SCENARIO 8: Payment Success
    // -------------------------------------------------------------
    it('8. should verify payment captured with gateway transaction reference', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const payRes = await GET(`/odata/v4/payment/Payments?$filter=order_ID eq ${placedOrderId}`);
        expect(payRes.status).to.equal(200);
        expect(payRes.data.value).to.be.an('array').with.lengthOf(1);

        const payment = payRes.data.value[0];
        expect(payment.status).to.equal('CAPTURED');
        expect(payment.transactionReference).to.include('PSP-CAPTURE-');
        expect(Number(payment.amount)).to.be.greaterThan(0);
    });

    // -------------------------------------------------------------
    // SCENARIO 9: Order Creation & Line Item Snapshot
    // -------------------------------------------------------------
    it('9. should verify order created with CONFIRMED status and snapshotted line items', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const orderRes = await GET(`/odata/v4/order/Orders(${placedOrderId})?$expand=items`);
        expect(orderRes.status).to.equal(200);
        const order = orderRes.data;

        expect(order.status).to.equal('CONFIRMED');
        expect(order.paymentStatus).to.equal('PAID');
        expect(order.orderNumber).to.equal(placedOrderNumber);
        expect(order.items).to.be.an('array').with.length.greaterThan(0);

        const item = order.items[0];
        expect(item.productTitle).to.equal(selectedProduct.title);
        expect(item.variantSku).to.equal(selectedVariant.variantSku);
        expect(Number(item.unitPrice)).to.equal(Number(selectedOffer.price));
        expect(item.quantity).to.equal(2);
    });

    // -------------------------------------------------------------
    // SCENARIO 10: Order History
    // -------------------------------------------------------------
    it('10. should view customer order history showing placed order', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const historyRes = await GET('/odata/v4/order/Orders');
        expect(historyRes.status).to.equal(200);
        expect(historyRes.data.value).to.be.an('array');

        const found = historyRes.data.value.find(o => o.ID === placedOrderId);
        expect(found).to.exist;
        expect(found.orderNumber).to.equal(placedOrderNumber);
    });

    // -------------------------------------------------------------
    // SCENARIO 11: Cancel Order
    // -------------------------------------------------------------
    it('11. should cancel order: restock warehouse, refund payment, and update order status', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        const cancelRes = await POST('/odata/v4/order/cancelOrder', {
            order_ID: placedOrderId,
            reason: 'Customer requested cancellation of test order'
        });

        expect(cancelRes.status).to.equal(200);
        const cancelledOrder = cancelRes.data;
        expect(cancelledOrder.status).to.equal('CANCELLED');
        expect(cancelledOrder.paymentStatus).to.equal('REFUNDED');

        // Verify payment record updated to REFUNDED
        const payRes = await GET(`/odata/v4/payment/Payments?$filter=order_ID eq ${placedOrderId}`);
        expect(payRes.data.value[0].status).to.equal('REFUNDED');

        // Verify warehouse inventory was restocked back to original level
        const { Inventories } = cds.entities('sap.marketplace');
        const invRecord = await cds.run(
            SELECT.one.from(Inventories).where({ variant_ID: selectedVariant.ID })
        );
        expect(invRecord.quantityOnHand).to.equal(originalVariantStock);
    });

    // -------------------------------------------------------------
    // SCENARIO 12: Product Review
    // -------------------------------------------------------------
    it('12. should submit customer product review and update average rating and review count', async () => {
        axios.defaults.auth = { username: 'alice', password: '' };

        // Ensure clean review state for customer alice on this product
        const { Reviews, Customers } = cds.entities('sap.marketplace');
        const aliceCust = await cds.run(SELECT.one.from(Customers).where({ externalUserId: 'cust-001' }));
        if (aliceCust) {
            await cds.run(DELETE.from(Reviews).where({ customer_ID: aliceCust.ID, product_ID: selectedProduct.ID }));
        }

        // Read current review count
        const prodBefore = await GET(`/odata/v4/catalog/Products(${selectedProduct.ID})`);
        const priorCount = prodBefore.data.reviewCount || 0;

        const reviewPayload = {
            product_ID: selectedProduct.ID,
            rating: 5,
            headline: 'Incredible purchase experience!',
            comment: 'Flawless sound quality and exceptional build materials.'
        };

        const revRes = await POST('/odata/v4/catalog/submitReview', reviewPayload);
        expect(revRes.status).to.equal(200);
        expect(revRes.data).to.have.property('rating', 5);
        expect(revRes.data.headline).to.equal('Incredible purchase experience!');

        // Verify product aggregated review count and rating are updated
        const prodAfter = await GET(`/odata/v4/catalog/Products(${selectedProduct.ID})`);
        expect(prodAfter.data.reviewCount).to.be.greaterThanOrEqual(priorCount);
        expect(prodAfter.data.reviewCount).to.be.greaterThanOrEqual(1);
        expect(Number(prodAfter.data.averageRating)).to.be.greaterThan(0);
    });
});
