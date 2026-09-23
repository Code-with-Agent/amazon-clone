# OData V4 API Reference Manual

**Platform:** SAP Cloud Application Programming Model (CAP) Node.js  
**Protocol:** OData V4.01 JSON over HTTPS  
**Base Path:** `/odata/v4/`  

---

## Service Overview

| Service Name | Base Endpoint | Primary Roles Required | Description |
| :--- | :--- | :--- | :--- |
| **`CatalogService`** | `/odata/v4/catalog/` | `any` (Browse), `Customer` (Reviews) | Public catalog browsing, search, categories, reviews, and ratings. |
| **`CartService`** | `/odata/v4/cart/` | `Customer`, `Administrator` | Customer active shopping cart, quantity updates, and promotional coupons. |
| **`OrderService`** | `/odata/v4/order/` | `Customer`, `OrderManager`, `Seller`, `Administrator` | 18-step enterprise checkout, order tracking, returns, and cancellations. |
| **`CustomerService`** | `/odata/v4/customer/` | `Customer`, `Administrator` | Customer profile, delivery addresses, wishlists, and notifications. |
| **`InventoryService`** | `/odata/v4/inventory/` | `InventoryManager`, `Seller`, `Administrator` | Multi-warehouse stock tracking, stock reservations, releases, and audits. |
| **`PaymentService`** | `/odata/v4/payment/` | `Customer`, `OrderManager`, `Administrator` | Payment transaction records, simulated processing, and role-protected refunds. |
| **`AdminService`** | `/odata/v4/admin/` | `ProductManager`, `OrderManager`, `InventoryManager`, `Administrator` | Backoffice master data governance, draft-enabled entities, and fulfillment. |

---

## 1. CatalogService (`/odata/v4/catalog/`)

### Endpoints & Entities

#### `GET /odata/v4/catalog/Categories`
* **Role:** Anonymous (`any`)
* **Description:** Retrieves active product categories.
* **Query Parameters:** `$filter`, `$select`, `$expand=children,parent`
* **Sample Response:**
  ```json
  {
    "@odata.context": "$metadata#Categories",
    "value": [
      {
        "ID": "cat00000-0000-0000-0000-000000000001",
        "code": "ELECTRONICS",
        "name": "Electronics & Computers",
        "level": 1,
        "displayOrder": 1,
        "imageUrl": "https://images.unsplash.com/photo-1498049794561-7780e7231661"
      }
    ]
  }
  ```

#### `GET /odata/v4/catalog/Products`
* **Role:** Anonymous (`any`)
* **Description:** Retrieves active catalog products with optional variant and image expansions.
* **Supported Expansions:** `$expand=variants($expand=offers($expand=seller)),images,reviews,category`
* **Sample Filter:**
  `?$filter=contains(title, 'Headphones') and averageRating ge 4.00`

### Actions & Functions

#### `POST /odata/v4/catalog/submitReview`
* **Role:** `Customer`, `Administrator`
* **Input Parameters:**
  ```json
  {
    "product_ID": "p0000000-0000-0000-0000-000000000002",
    "rating": 5,
    "headline": "Exceptional build quality!",
    "comment": "The active noise cancellation is the best I have ever experienced."
  }
  ```
* **Response:** Created `Reviews` entity with verified purchase indicator and updated product rating.

#### `POST /odata/v4/catalog/markReviewHelpful`
* **Role:** `Customer`, `Administrator`
* **Input Parameters:**
  ```json
  {
    "review_ID": "rev00000-0000-0000-0000-000000000001",
    "isHelpful": true
  }
  ```
* **Response:** Returns updated integer count of helpful votes.

---

## 2. CartService (`/odata/v4/cart/`)

### Actions & Functions

#### `POST /odata/v4/cart/addToCart`
* **Role:** `Customer`, `Administrator`
* **Parameters:** `product_ID` (UUID), `variant_ID` (UUID, optional), `offer_ID` (UUID, optional), `quantity` (Integer)
* **Sample Request:**
  ```json
  {
    "offer_ID": "o0000000-0000-0000-0000-000000000001",
    "quantity": 2
  }
  ```
* **Response:** Returns complete updated `ActiveCart` with recalculated financial totals.

#### `POST /odata/v4/cart/updateCartQuantity`
* **Role:** `Customer`, `Administrator`
* **Parameters:** `cartItem_ID` (UUID), `quantity` (Integer)
* **Response:** Updated `ActiveCart`. Quantity `<= 0` removes the item.

#### `POST /odata/v4/cart/applyCoupon`
* **Role:** `Customer`, `Administrator`
* **Parameters:** `couponCode` (String)
* **Sample Request:**
  ```json
  {
    "couponCode": "SAVE10"
  }
  ```
* **Response:** Updated `ActiveCart` with applied coupon and discount amount.

#### `POST /odata/v4/cart/validateCart`
* **Role:** `Customer`, `Administrator`
* **Response:**
  ```json
  {
    "isValid": true,
    "issues": []
  }
  ```

---

## 3. OrderService (`/odata/v4/order/`)

### Endpoints & Actions

#### `GET /odata/v4/order/Orders`
* **Role:** `Customer` (filtered to own orders), `Seller` (filtered to orders with own items), `OrderManager`, `Administrator` (all orders)
* **Query Parameters:** `$expand=items,shipments,payment,history`

#### `POST /odata/v4/order/checkout`
* **Role:** `Customer`, `Administrator`
* **Description:** Executes atomic 18-step checkout: validates cart, reserves stock holds, generates unique order number (`ORD-YYYYMMDD-XXXX`), captures payment transaction, records coupon redemptions, and clears the cart.
* **Sample Request:**
  ```json
  {
    "shippingAddress_ID": "a0000000-0000-0000-0000-000000000001",
    "billingAddress_ID": "a0000000-0000-0000-0000-000000000002",
    "paymentMethod": "CREDIT_CARD",
    "paymentToken": "tok_visa_valid",
    "simulateOutcome": "SUCCESS"
  }
  ```
* **Sample Response:**
  ```json
  {
    "order_ID": "3f98c257-238b-4a57-b089-8d75ea9c5d12",
    "orderNumber": "ORD-20260923-4821",
    "totalAmount": "259.98",
    "currency": "USD",
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "message": "Order placed successfully"
  }
  ```

#### `POST /odata/v4/order/cancelOrder`
* **Role:** `Customer` (own order), `OrderManager`, `Administrator`
* **Parameters:** `order_ID` (UUID), `reason` (String)
* **Behavior:** Checks cancellation eligibility (`PENDING_PAYMENT`, `CONFIRMED`, `PROCESSING`), releases or restocks warehouse inventory, processes payment refund, and generates audit notification.

---

## 4. CustomerService (`/odata/v4/customer/`)

### Endpoints & Actions

#### `GET /odata/v4/customer/Profile`
* **Role:** `Customer` (isolated to own profile), `Administrator`
* **Sample Response:**
  ```json
  {
    "value": [
      {
        "ID": "c0000000-0000-0000-0000-000000000001",
        "externalUserId": "cust-001",
        "firstName": "Alice",
        "lastName": "Smith",
        "email": "alice.smith@example.com",
        "status": "ACTIVE"
      }
    ]
  }
  ```

#### `POST /odata/v4/customer/addToWishlist`
* **Parameters:** `product_ID` (UUID), `variant_ID` (UUID, optional)

#### `POST /odata/v4/customer/markNotificationAsRead`
* **Parameters:** `notification_ID` (UUID)

---

## 5. InventoryService (`/odata/v4/inventory/`)

### Actions

#### `POST /odata/v4/inventory/reserveInventory`
* **Role:** `InventoryManager`, `Administrator`
* **Parameters:**
  ```json
  {
    "order_ID": "3f98c257-238b-4a57-b089-8d75ea9c5d12",
    "items": [
      {
        "variant_ID": "v0000000-0000-0000-0000-000000000001",
        "quantity": 2
      }
    ]
  }
  ```

#### `POST /odata/v4/inventory/syncWarehouseStock`
* **Role:** `InventoryManager`, `Administrator`
* **Parameters:** `warehouse_ID` (UUID), `variant_ID` (UUID), `countOnHand` (Integer)

---

## 6. PaymentService (`/odata/v4/payment/`)

### Actions

#### `POST /odata/v4/payment/createPayment`
* **Role:** `Customer`, `Administrator`
* **Parameters:** `order_ID` (UUID), `paymentProvider` (String), `paymentToken` (String), `paymentMethod` (String)

#### `POST /odata/v4/payment/refundPayment`
* **Role:** `OrderManager`, `Administrator`
* **Parameters:** `payment_ID` (UUID), `amount` (Decimal), `reason` (String)

---

## 7. AdminService (`/odata/v4/admin/`)

### Draft-Enabled Entities & Backoffice Governance

* `Categories` (`@odata.draft.enabled`)
* `Products` (`@odata.draft.enabled`, `@cds.redirection.target`)
* `Promotions` (`@odata.draft.enabled`)

### Administrative Actions

* `POST /odata/v4/admin/fulfillShipment`: Creates dispatch consignment with carrier and tracking reference.
* `POST /odata/v4/admin/moderateReview`: Approves or rejects customer product reviews.
* `POST /odata/v4/admin/approveSeller`: Activates pending seller merchant registrations.
