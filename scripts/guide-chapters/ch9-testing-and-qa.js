export const ch9 = `
# Chapter 9: Enterprise Automated Testing & Quality Assurance

## 9.1 The Testing Philosophy in SAP CAP
In enterprise applications, manual testing is insufficient. A change in a single CDS entity or calculation handler can ripple across multiple downstream services.
Our project features **136 automated tests across 9 comprehensive test suites**, achieving 100% pass rate.

We use the official SAP testing harness **\`@cap-js/cds-test\`**, combined with **Mocha** and **Chai**:

\`\`\`javascript
import cds from '@sap/cds';
const { GET, POST, expect } = cds.test(__dirname + '/..');
\`\`\`

### Why \`@cap-js/cds-test\` is Powerful:
* Automatically spins up a real CAP test server with an in-memory database.
* Deploys the entire \`db/schema.cds\` and populates seed data from \`db/data/\` in milliseconds.
* Provides high-level HTTP client helpers (\`GET\`, \`POST\`, \`PATCH\`, \`DELETE\`) with built-in mock authentication:
  \`\`\`javascript
  // Send request as Alice (Customer role)
  const response = await GET('/odata/v4/cart/Carts', { auth: { username: 'alice' } });
  \`\`\`

---

## 9.2 The 9 Test Suites Breakdown

| Test Suite | File Path | Focus Area |
| :--- | :--- | :--- |
| **1. Catalog Tests** | \`test/catalog.test.js\` | Category hierarchy, product search, brand filters, active status |
| **2. Cart Tests** | \`test/cart.test.js\` | Add to cart, quantity change, tax & shipping calculations, coupons |
| **3. Checkout & Orders** | \`test/checkout-order.test.js\` | 18-step checkout, stock reservation, cancellations, customer returns |
| **4. Customer Service** | \`test/customer-service.test.js\` | Profile, addresses, wishlist, notifications, data isolation |
| **5. Inventory & Admin** | \`test/inventory-admin.test.js\` | Real-time stock counts, reservations, warehouse sync, shipments |
| **6. Payment Service** | \`test/payment-service.test.js\` | Payment capture, simulated card gateway, refunds, idempotency |
| **7. Security & XSUAA** | \`test/auth-xsuaa.test.js\` | 401 unauthenticated, 403 forbidden, role-based access control |
| **8. Negative & Edge Cases** | \`test/negative-scenarios.test.js\` | Insufficient stock, invalid coupons, empty cart checkout |
| **9. Critical E2E Flow** | \`test/e2e-critical-flow.test.js\` | **12-Step sequential user journey** simulating real shopper |

---

## 9.3 The 12-Step End-to-End Critical User Journey

In \`test/e2e-critical-flow.test.js\`, we execute a complete sequential business flow:

\`\`\`
1. Browse Catalog  --> 2. Search Product  --> 3. Open Details  --> 4. Add to Cart
        |
        v
5. Change Quantity --> 6. Apply Coupon    --> 7. Checkout       --> 8. Payment Capture
        |
        v
9. Order Created   --> 10. View History   --> 11. Cancel Order  --> 12. Submit Review
\`\`\`

### Real Test Code Example:
\`\`\`javascript
it('should execute 18-step checkout successfully', async () => {
    const { data } = await POST('/odata/v4/order/checkout', {
        cartId: 'cart0000-0000-0000-0000-000000000001',
        shippingAddressId: 'addr0000-0000-0000-0000-000000000001',
        billingAddressId:  'addr0000-0000-0000-0000-000000000001',
        paymentMethod: 'CREDIT_CARD',
        couponCode: 'WELCOME10'
    }, { auth: { username: 'alice' } });

    expect(data.status).to.equal('CONFIRMED');
    expect(data.orderNumber).to.match(/^ORD-/);
    expect(data.totalAmount).to.be.greaterThan(0);
});
\`\`\`

---

## 9.4 Running Tests and Linting

Every junior developer must run these commands before submitting code:

\`\`\`bash
# Run all 136 tests:
npm test

# Run CDS code style and syntax linter:
npm run lint
\`\`\`
`;
