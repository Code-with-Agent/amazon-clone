export const ch2 = `
# Chapter 2: Core Data Services (CDS) Modeling Deep Dive

## 2.1 The Philosophy of CDS Modeling (\`db/schema.cds\`)
In SAP CAP, your entire business reality is defined in **Core Data Services (CDS)**. Think of CDS as a high-level, human-readable domain definition language that combines:
* Relational database DDL (tables, primary keys, foreign keys, unique constraints).
* Type systems (strings, decimals, booleans, enums).
* Object-oriented aspects (reusable traits, mixins).
* Entity relationship graphs (associations and compositions).

Let us open \`db/schema.cds\` and analyze how our marketplace data model was constructed.

---

## 2.2 Standard Aspects from \`@sap/cds/common\`

At the top of \`db/schema.cds\`, you will find:

\`\`\`cds
using { cuid, managed } from '@sap/cds/common';
\`\`\`

CAP provides pre-built, standardized building blocks called **Aspects**. Reusing these aspects is a core CAP best practice:

### 1. \`cuid\` (Canonical Unique Identifier)
When you define an entity with \`: cuid\`:
\`\`\`cds
entity Products : cuid, managed { ... }
\`\`\`
CAP automatically generates a primary key property:
\`\`\`cds
key ID : UUID;
\`\`\`
* Why this matters: You never need to write manual auto-incrementing integer IDs. UUIDs prevent ID guessing attacks, allow distributed ID generation across offline clients, and eliminate sequence collisions in multi-tenant cloud environments.

### 2. \`managed\` (Audit Logging)
When you add \`: managed\` to an entity, CAP automatically injects four audit fields:
\`\`\`cds
createdAt  : Timestamp;
createdBy  : User;
modifiedAt : Timestamp;
modifiedBy : User;
\`\`\`
* Why this matters: When a user places an order or updates a product, CAP automatically extracts the authenticated user's ID (\`req.user.id\`) and the current UTC timestamp, writing them into the record. You do not write a single line of handler code to maintain these audit columns!

---

## 2.3 Associations vs. Compositions: The Most Critical Concept in CAP

One of the most frequent mistakes junior developers make in CAP is using an **Association** when they should have used a **Composition**, or vice-versa. Understanding the distinction is vital.

| Feature | Association (\`Association to\`) | Composition (\`Composition of\`) |
| :--- | :--- | :--- |
| **Relationship** | Loose relationship (Peer-to-Peer) | Strict Parent-Child ownership |
| **Lifecycle** | Independent. Child exists without parent. | Dependent. Child cannot exist without parent. |
| **Deletion** | Deleting parent leaves target intact. | **Cascading Delete:** Deleting parent deletes all children. |
| **Deep Inserts** | Requires separate creation or existing UUIDs. | Supports single-payload **Deep Insert** (e.g., Order with 10 Items). |
| **Draft Support** | Target entity is not part of parent draft. | Target entities are edited together in Fiori draft mode. |

### Code Comparison from Our Application

#### Example 1: Association (Loose Relationship)
Look at \`Products\` in \`db/schema.cds\`:
\`\`\`cds
entity Products : cuid, managed {
    category : Association to Categories;
    seller   : Association to Sellers;
    ...
}
\`\`\`
* **Why Association?** A \`Category\` (e.g., "Electronics") exists independently of any single product. If a product is deleted, the category must **NOT** be deleted. Similarly, a \`Seller\` is an independent business entity.

#### Example 2: Composition (Parent-Child Lifecycle)
Look at \`Orders\` and \`OrderItems\` in \`db/schema.cds\`:
\`\`\`cds
entity Orders : cuid, managed {
    orderNumber : String(32);
    customer    : Association to Customers;
    items       : Composition of many OrderItems on items.order = $self;
    ...
}

entity OrderItems : cuid {
    order       : Association to Orders;
    product     : Association to Products;
    quantity    : Integer;
    unitPrice   : Decimal(12, 2);
    totalPrice  : Decimal(12, 2);
}
\`\`\`
* **Why Composition?** An \`OrderItem\` has no standalone existence outside of the \`Order\` it belongs to. If an order is deleted, all its line items must be deleted with it. When a customer executes checkout, CAP allows submitting the entire order and its items in a single HTTP POST request because of this composition!
* Notice the back-link syntax: \`items.order = $self\`. \`$self\` is a special CDS keyword representing the parent entity instance.

---

## 2.4 The Complete Domain Entity Graph

Our marketplace model in \`db/schema.cds\` spans 4 key domains:

\`\`\`
+-----------------------------------------------------------------------------------+
|                                  CATALOG DOMAIN                                   |
|                                                                                   |
|  [Categories] <---- (category) ---- [Products] ---- (seller) ----> [Sellers]     |
|                                         |                                         |
|                                (variants) Composition                             |
|                                         v                                         |
|                                 [ProductVariants]                                 |
|                                         |                                         |
|                                  (offers) Composition                             |
|                                         v                                         |
|                                  [ProductOffers]                                  |
+-----------------------------------------------------------------------------------+
                                          |
                                          | (linked by variant)
                                          v
+-----------------------------------------------------------------------------------+
|                                 INVENTORY DOMAIN                                  |
|                                                                                   |
|         [ProductVariants] <----+                                                  |
|                                | (variant)                                        |
|                                v                                                  |
|  [Warehouses] <---(warehouse)--- [Inventories]                                    |
|                       (quantityAvailable, quantityReserved)                      |
+-----------------------------------------------------------------------------------+
                                          |
                                          | (reserved on checkout)
                                          v
+-----------------------------------------------------------------------------------+
|                                ORDER & CHECKOUT DOMAIN                            |
|                                                                                   |
|  [Customers] <---(customer)--- [Orders] <---(order)--- [Shipments]                |
|                                   |        <---(order)--- [Payments]              |
|                                   | (items) Composition                           |
|                                   v                                               |
|                              [OrderItems]                                         |
+-----------------------------------------------------------------------------------+
\`\`\`

### 1. Catalog & Merchandising Entities:
* **\`Categories\`**: Hierarchical tree structure using parent-child association (\`parent : Association to Categories\`), supporting nested levels (Level 1: Electronics, Level 2: Computers, Level 3: Laptops).
* **\`Products\`**: The core product master holding title, brand, description, and base metrics.
* **\`ProductVariants\`**: Physical SKU representations holding color, size, and weight.
* **\`ProductImages\`**: Media URLs, alternate text, and display sort order.
* **\`ProductOffers\`**: Multi-seller marketplace pricing, condition (NEW, REFURBISHED), and active flags.

### 2. Inventory & Warehousing Entities:
* **\`Warehouses\`**: Physical logistics centers with geographic codes and country codes.
* **\`Inventories\`**: Real-time stock counts. Notice the dual fields:
  * \`quantityAvailable\`: Physical inventory sitting on shelves.
  * \`quantityReserved\`: Stock temporarily held for orders currently in checkout or pending payment.
  * *Formula:* Effective stock to sell = \`quantityAvailable - quantityReserved\`.

### 3. Orders & Financial Transactions:
* **\`Orders\`**: Order header storing customer reference, billing/shipping address snapshots, financial aggregates (subtotal, tax, shipping, discount, total), and lifecycle status.
* **\`OrderItems\`**: Price-frozen snapshots of purchased items to preserve historical invoice integrity even if catalog prices change later.
* **\`Payments\`**: Audit trail of financial captures, payment methods (Credit Card, PayPal, Apple Pay), transaction references, and refund tokens.
* **\`Shipments\`**: Consignments, tracking numbers, carriers (DHL, FedEx, UPS), and dispatch timestamps.

---

## 2.5 Seed Data File Conventions (\`db/data/\`)

In CAP, you can provide initial mock data using CSV files located in \`db/data/\`.
CAP uses an exact file naming convention:

\`\`\`
<namespace>-<EntityName>.csv
\`\`\`

In our project, the namespace in \`db/schema.cds\` is:
\`\`\`cds
namespace sap.marketplace;
\`\`\`
Therefore, the seed files are named:
* \`sap.marketplace-Products.csv\`
* \`sap.marketplace-Categories.csv\`
* \`sap.marketplace-Customers.csv\`
* \`sap.marketplace-Orders.csv\`

### Handling Foreign Keys in CSV:
When an entity has an association:
\`\`\`cds
category : Association to Categories;
\`\`\`
CAP maps this in SQL to a foreign key column named \`category_ID\`.
In your CSV header row, you must name the column \`category_ID\` and provide the UUID of the target record.
`;
