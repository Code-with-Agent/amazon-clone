export const ch4 = `
# Chapter 4: Event Handlers & Business Logic Implementation

## 4.1 The Event-Driven Architecture of CAP Services
In standard Express.js, routing and business logic are mixed together in controller functions. In SAP CAP, services are **Event Emitters**. Every CRUD request and every custom action triggers an event that travels through a three-phase pipeline:

\`\`\`
Client HTTP Request
        |
        v
+-----------------------------------------------------------+
| 1. BEFORE Phase: this.before(['CREATE', 'UPDATE'], ...)   |
|    - Input validation & parameter sanitization            |
|    - Role & tenancy pre-checks                            |
|    - Prevents invalid requests from hitting database      |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 2. ON Phase: this.on(['READ', 'checkout'], ...)           |
|    - The core execution handler                           |
|    - Replaces default handler or handles custom actions   |
|    - Queries/modifies database via CQL                    |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
| 3. AFTER Phase: this.after(['READ'], ...)                 |
|    - Enriching returned data                              |
|    - Calculating virtual properties                       |
|    - Sending asynchronous audit logs & notifications      |
+-----------------------------------------------------------+
        |
        v
Client HTTP Response
\`\`\`

---

## 4.2 The Request Object (\`req\`) and Error Handling

Every handler in CAP receives a \`req\` object. Master these fundamental methods:

1. **\`req.data\`**: Contains the input payload sent by the client.
2. **\`req.user\`**: Represents the authenticated user.
   * \`req.user.id\`: The user's ID/email.
   * \`req.user.is('Administrator')\`: Returns \`true\` if user has the role.
3. **\`req.reject(httpCode, errorMessage)\`**: Immediately terminates the request and rolls back the active database transaction!
   \`\`\`javascript
   if (stockAvailable < item.quantity) {
       req.reject(400, \`Insufficient stock for product \${item.title}. Only \${stockAvailable} left.\`);
   }
   \`\`\`
4. **\`req.error(httpCode, errorMessage)\`**: Queues an error message to return to the client without aborting immediately (useful for collecting multiple validation errors).

---

## 4.3 Database Queries with CDS Query Language (CQL)

CAP provides a fluent query builder called **CQL** that executes dialect-agnostic SQL:

\`\`\`javascript
import cds from '@sap/cds';

// 1. SELECT query with conditions and sorting
const products = await SELECT.from('sap.marketplace.Products')
    .where({ status: 'ACTIVE' })
    .orderBy('averageRating desc')
    .limit(10);

// 2. INSERT a new record
await INSERT.into('sap.marketplace.Orders').entries({
    orderNumber: 'ORD-2026-001',
    customer_ID: customerId,
    totalAmount: 199.99
});

// 3. UPDATE with atomic math expression
await UPDATE('sap.marketplace.Inventories')
    .set('quantityReserved = quantityReserved +', requestedQty)
    .where({ variant_ID: variantId });

// 4. DELETE
await DELETE.from('sap.marketplace.CartItems').where({ cart_ID: cartId });
\`\`\`

---

## 4.4 Real-World Deep Dive: The 18-Step Enterprise Checkout Flow

In \`srv/order-service.js\`, our \`checkout\` action orchestrates a complete 18-step distributed transaction. Let us walk through the exact enterprise steps:

\`\`\`javascript
this.on('checkout', async (req) => {
    const { cartId, shippingAddressId, billingAddressId, paymentMethod, couponCode } = req.data;
    const tx = cds.tx(req); // Bind to current database transaction

    // Step 1: Validate customer authentication
    const userEmail = req.user.id;
    const customer = await tx.run(SELECT.one.from('sap.marketplace.Customers').where({ email: userEmail }));
    if (!customer) req.reject(401, 'Customer profile not found');

    // Step 2: Retrieve active cart and verify it has items
    const cart = await tx.run(SELECT.one.from('sap.marketplace.Carts').where({ ID: cartId }));
    const items = await tx.run(SELECT.from('sap.marketplace.CartItems').where({ cart_ID: cartId, isSavedForLater: false }));
    if (!items || items.length === 0) {
        req.reject(400, 'Cannot checkout an empty shopping cart');
    }

    // Step 3: Validate Shipping & Billing Addresses belong to customer
    const shipAddr = await tx.run(SELECT.one.from('sap.marketplace.Addresses').where({ ID: shippingAddressId, customer_ID: customer.ID }));
    if (!shipAddr) req.reject(400, 'Invalid shipping address selected');

    // Step 4: Verify warehouse inventory availability for all items
    for (const item of items) {
        const inv = await tx.run(SELECT.one.from('sap.marketplace.Inventories').where({ variant_ID: item.variant_ID }));
        const available = (inv?.quantityAvailable || 0) - (inv?.quantityReserved || 0);
        if (available < item.quantity) {
            req.reject(400, \`Insufficient stock for item \${item.variant_ID}. Available: \${available}\`);
        }
    }

    // Step 5: Temporarily reserve stock to prevent race conditions
    for (const item of items) {
        await tx.run(UPDATE('sap.marketplace.Inventories')
            .set('quantityReserved = quantityReserved +', item.quantity)
            .where({ variant_ID: item.variant_ID }));
    }

    // Step 6: Calculate financial totals (Subtotal, Tax, Shipping, Coupon)
    const subtotal = items.reduce((acc, cur) => acc + Number(cur.totalPrice), 0);
    const tax = Number((subtotal * 0.08).toFixed(2));
    const shipping = subtotal > 50 ? 0.00 : 9.99;
    let discount = 0.00;
    if (couponCode) {
        const coupon = await tx.run(SELECT.one.from('sap.marketplace.Coupons').where({ code: couponCode, isActive: true }));
        if (coupon) discount = Number(((subtotal * coupon.discountPercentage) / 100).toFixed(2));
    }
    const grandTotal = Number((subtotal + tax + shipping - discount).toFixed(2));

    // Step 7: Generate human-readable order number
    const orderNumber = \`ORD-\${new Date().toISOString().slice(0,10).replace(/-/g,'')}-\${Math.floor(1000 + Math.random() * 9000)}\`;

    // Step 8: Create Order Header record
    const orderId = cds.utils.uuid();
    await tx.run(INSERT.into('sap.marketplace.Orders').entries({
        ID: orderId,
        orderNumber,
        customer_ID: customer.ID,
        shippingAddress_ID: shippingAddressId,
        billingAddress_ID: billingAddressId,
        subtotalAmount: subtotal,
        taxAmount: tax,
        shippingAmount: shipping,
        discountAmount: discount,
        totalAmount: grandTotal,
        orderStatus: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID'
    }));

    // Step 9: Create snapshot OrderItems
    for (const item of items) {
        await tx.run(INSERT.into('sap.marketplace.OrderItems').entries({
            order_ID: orderId,
            product_ID: item.product_ID,
            variant_ID: item.variant_ID,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
        }));
    }

    // Step 10: Process Payment capture via PaymentService
    const paymentService = await cds.connect.to('PaymentService');
    try {
        const paymentResult = await paymentService.createPayment({
            orderId,
            amount: grandTotal,
            currency: 'USD',
            paymentMethod
        });

        // Step 11: Payment success: commit inventory & update order
        for (const item of items) {
            await tx.run(UPDATE('sap.marketplace.Inventories')
                .set({
                    quantityAvailable: { '-=': item.quantity },
                    quantityReserved:  { '-=': item.quantity }
                })
                .where({ variant_ID: item.variant_ID }));
        }

        await tx.run(UPDATE('sap.marketplace.Orders')
            .set({ orderStatus: 'CONFIRMED', paymentStatus: 'PAID' })
            .where({ ID: orderId }));

        // Step 12: Clear cart items & send customer notification
        await tx.run(DELETE.from('sap.marketplace.CartItems').where({ cart_ID: cartId }));
        await tx.run(INSERT.into('sap.marketplace.Notifications').entries({
            customer_ID: customer.ID,
            title: 'Order Confirmed',
            message: \`Your order \${orderNumber} has been received and confirmed.\`,
            isRead: false
        }));

        return { orderId, orderNumber, status: 'CONFIRMED', totalAmount: grandTotal };

    } catch (err) {
        // Step 13: Payment failed: Rollback inventory hold & reject
        for (const item of items) {
            await tx.run(UPDATE('sap.marketplace.Inventories')
                .set('quantityReserved = quantityReserved -', item.quantity)
                .where({ variant_ID: item.variant_ID }));
        }
        await tx.run(UPDATE('sap.marketplace.Orders')
            .set({ orderStatus: 'PAYMENT_FAILED', paymentStatus: 'FAILED' })
            .where({ ID: orderId }));
        req.reject(402, \`Payment transaction failed: \${err.message}\`);
    }
});
\`\`\`

### Key Junior Takeaways:
1. **Never perform multiple writes without \`cds.tx(req)\`**: If a network failure occurs midway, the transaction rollback prevents orphaned records or incorrect inventory deductions.
2. **Snapshot line items**: Notice step 9 writes \`unitPrice\` and \`totalPrice\` into \`OrderItems\`. Never calculate historical orders dynamically from current product prices.
`;
