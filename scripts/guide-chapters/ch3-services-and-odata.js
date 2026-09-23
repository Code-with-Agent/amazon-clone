export const ch3 = `
# Chapter 3: Service Definition & OData V4 Exposure

## 3.1 Why Separate Services from the Database?
In naive database applications, developers often expose tables directly as REST endpoints. In enterprise software, this is an anti-pattern known as **Database Leaking**. Exposing database tables directly creates severe security and maintenance issues:
1. Internal database fields (e.g., cost prices, audit timestamps, soft-delete flags) are accidentally leaked to public APIs.
2. Changes to the database schema break frontend client applications.
3. Different client types (Public Shop vs. Authenticated Customer vs. Warehouse Worker) need completely different views of the same underlying data.

In SAP CAP, **Services** are declared in \`srv/*.cds\` as specialized business facades over the domain model.

---

## 3.2 The Anatomy of a Service Projection

Look at \`srv/catalog-service.cds\`:

\`\`\`cds
using { sap.marketplace as db } from '../db/schema';

service CatalogService @(path: '/odata/v4/catalog') {
    @readonly
    entity Products as projection on db.Products {
        *,
        virtual null as discountPercentage : Decimal(5, 2),
        virtual null as primaryImageUrl    : String(500)
    } excluding {
        costPrice
    };
}
\`\`\`

Let us dissect what each part of this definition does:

1. **\`using { sap.marketplace as db }\`**: Imports the domain schema as a namespace alias \`db\`.
2. **\`@(path: '/odata/v4/catalog')\`**: Explicitly mounts this service at the given HTTP URL path. By default, CAP serves services at \`/<service-name>\`. Specifying \`/odata/v4/catalog\` guarantees consistent enterprise URL routing.
3. **\`@readonly\`**: Informs the OData runtime and compiler that clients can only perform HTTP \`GET\` requests. Any client attempting \`POST\`, \`PUT\`, or \`DELETE\` will be immediately rejected with \`405 Method Not Allowed\`.
4. **\`as projection on db.Products { * }\`**: Exposes all fields from the database entity \`Products\`.
5. **\`virtual null as discountPercentage\`**: Declares a **virtual field**. A virtual field does **NOT** exist in the database table! It is dynamically calculated in memory by our Node.js custom handler (\`srv/catalog-service.js\`) before the response is returned to the user.
6. **\`excluding { costPrice }\`**: Strips the sensitive wholesale cost price from the public catalog API so malicious users cannot inspect profit margins in DevTools!

---

## 3.3 Actions vs. Functions in OData V4

In OData V4 and SAP CAP, business logic that goes beyond basic CRUD (Create, Read, Update, Delete) is modeled using **Actions** and **Functions**.

| Feature | Function | Action |
| :--- | :--- | :--- |
| **HTTP Verb** | \`GET\` | \`POST\` |
| **Side Effects** | **Strictly None (Idempotent)** | **May modify data (State Changes)** |
| **Use Case** | Computations, queries, checks | Checkout, cancel, payment, approval |
| **Parameters** | Passed in URL query string | Passed in JSON request body |

### 1. Function Example from Our Application:
Look at \`srv/cart-service.cds\`:
\`\`\`cds
function validateCart() returns {
    isValid : Boolean;
    messages : array of String;
};
\`\`\`
* A customer or frontend can call \`GET /odata/v4/cart/validateCart()\` to verify stock availability and pricing before proceeding to checkout. It changes nothing in the database.

### 2. Action Example from Our Application:
Look at \`srv/order-service.cds\`:
\`\`\`cds
action checkout(
    cartId          : UUID,
    shippingAddressId : UUID,
    billingAddressId  : UUID,
    paymentMethod   : String,
    couponCode      : String
) returns CheckoutResult;
\`\`\`
* The checkout action changes system state: it validates stock, decrements inventory, creates an order record, creates line items, and contacts payment gateway. It requires HTTP \`POST\`.

### 3. Bound vs. Unbound Actions:
* **Unbound Action:** Attached to the service itself (like \`checkout\` above). Invoked via \`POST /odata/v4/order/checkout\`.
* **Bound Action:** Attached to a specific entity instance. For example, in \`srv/order-service.cds\`:
  \`\`\`cds
  entity Orders as projection on db.Orders {
      ...
      action cancelOrder(reason: String) returns Orders;
  }
  \`\`\`
  Invoked on a specific order UUID: \`POST /odata/v4/order/Orders(1234-abcd)/cancelOrder\`.

---

## 3.4 The Crucial Navigation Rule in OData V4 ($expand)

> [!CAUTION]
> **The #1 Bug Junior Developers Encounter with CAP & OData V4**
> If entity \`A\` has an association to entity \`B\`, and the frontend asks for \`A\` with \`$expand=B\`, **entity B MUST be exposed in the exact same service as A!**

### The Real-World Bug We Fixed in This Project:
In our Storefront UI, the Shopping Cart view loaded cart items and expanded product details:
\`\`\`http
GET /odata/v4/cart/CartItems?$expand=product($expand=images),variant
\`\`\`

Initially, \`srv/cart-service.cds\` only exposed \`Carts\` and \`CartItems\`. When the browser loaded the cart, the server threw:
\`\`\`
[400] Bad Request: Navigation property "product" does not exist in service "CartService"
\`\`\`

### Why did this happen?
Even though \`product\` was defined in \`db/schema.cds\`, CAP enforces **Service Boundaries**. If \`Products\` is not declared inside \`CartService\`, the OData V4 metadata compiler strips the navigation property from \`CartService\` metadata.

### The Correct Enterprise Solution:
In \`srv/cart-service.cds\`, we expose **read-only projections** for the associated master data:

\`\`\`cds
service CartService @(path: '/odata/v4/cart') {
    entity Carts as projection on db.Carts;
    entity CartItems as projection on db.CartItems;

    // Read-only projections to enable OData V4 $expand navigation:
    @readonly entity Products as projection on db.Products;
    @readonly entity ProductVariants as projection on db.ProductVariants;
    @readonly entity ProductOffers as projection on db.ProductOffers;
    @readonly entity ProductImages as projection on db.ProductImages;
}
\`\`\`
Once added, the compiler generated the navigation graph in the EDMX metadata, and the storefront expanded product details with **HTTP 200 OK**!
`;
