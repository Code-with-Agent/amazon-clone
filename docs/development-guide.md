# Development & Contribution Guide

**Project:** Aura Enterprise Marketplace  
**Frameworks:** SAP Cloud Application Programming Model (Node.js), SAPUI5, SAP Fiori Elements  
**Database Engines:** SQLite (Local Dev) / SAP HANA Cloud (Production)  

---

## 1. Prerequisites & Environment Setup

### Required Tools
* **Node.js**: v18.x, v20.x, or v22.x LTS (Tested on Node v20/v24)
* **npm**: v9+ or v10+
* **SAP CDS DK**: `@sap/cds-dk` v8+ or v10+ (`npm install -g @sap/cds-dk`)
* **Cloud Foundry CLI**: `cf` v8+ with `multiapps` plugin (`cf install-plugin multiapps`)
* **Cloud MTA Build Tool**: `mbt` v1.2+ (`npm install -g mbt`)

### Clone and Install Dependencies
```bash
git clone <repository-url> amazon-clone
cd amazon-clone
npm install
```

---

## 2. Project Architecture & Directory Structure

```
amazon-clone/
├── app/                        # Frontend UI Applications & Services
│   ├── services.cds            # Central UI annotation entry point
│   ├── shop-ui/                # SAPUI5 Freestyle Customer Storefront
│   │   ├── webapp/             # Source files (Component, Views, Controllers, Fragments, i18n)
│   │   └── dist/               # Packaged UI5 zip artifact
│   └── admin-ui/               # SAP Fiori Elements Backoffice Application
│       ├── annotations.cds     # CDS UI Annotations (LineItem, HeaderInfo, Facets)
│       ├── webapp/             # Manifest, Views, Controllers, Sandbox Launchpad
│       └── dist/               # Packaged Admin zip artifact
├── db/                         # Domain Data Model & Persistence
│   ├── schema.cds              # Core entity definitions, types, compositions, associations
│   └── data/                   # Initial CSV data seed files
├── srv/                        # Business Logic & OData Services
│   ├── catalog-service.cds/.js # Public storefront catalog & reviews
│   ├── cart-service.cds/.js    # Shopping cart, line items, coupon logic
│   ├── order-service.cds/.js   # 18-step atomic checkout, order tracking, returns
│   ├── customer-service.cds/.js# Profiles, addresses, wishlists, notifications
│   ├── inventory-service.cds/.js# Multi-warehouse stock tracking & reservations
│   ├── payment-service.cds/.js # Payments, mock gateway simulations, refunds
│   └── admin-service.cds/.js   # Master data governance, reviews, draft operations
├── docs/                       # Architecture, API, Deployment, Testing documentation
├── test/                       # Automated Test Suites (Mocha + Chai + @cap-js/cds-test)
├── scripts/                    # Build utilities (UI packagers)
├── mta.yaml                    # Multitarget Application deployment descriptor
├── xs-security.json            # SAP BTP XSUAA authentication & scope configuration
└── package.json                # Project dependencies, test scripts, CDS configuration
```

---

## 3. Local Development Workflows

### Running Backend with Live Reload (`cds watch`)
```bash
npm run watch
# or
npx cds watch
```
* The CAP runtime compiles CDS models into memory, creates an in-memory SQLite database, loads initial CSV records from `db/data/`, and mounts services at `http://localhost:4004`.
* Explore OData metadata and raw entity sets via the built-in index page at `http://localhost:4004`.

### Testing Local Storefront & Admin UIs
With `cds watch` running:
* **Shop Storefront**: `http://localhost:4004/shop-ui/webapp/index.html`
* **Admin Backoffice**: `http://localhost:4004/admin-ui/webapp/index.html`
* **Fiori Launchpad Sandbox**: `http://localhost:4004/admin-ui/webapp/flpSandbox.html`

### Mock Users & Role Testing
In development mode, `@sap/cds` runs with `auth: "mocked"`. You can test different security contexts via HTTP Basic Authentication:

| Username | Password | Role | Description |
| :--- | :--- | :--- | :--- |
| `alice` | *(blank)* | `Customer` | Storefront shopper Alice Smith (`cust-001`) |
| `bob_customer` | *(blank)* | `Customer` | Storefront shopper John Doe (`cust-002`) |
| `seller_tech` | *(blank)* | `Seller` | Electronics Merchant Partner (`seller-001`) |
| `carol_prod` | *(blank)* | `ProductManager` | Catalog & campaign administrator |
| `dave_order` | *(blank)* | `OrderManager` | Logistics & order fulfillment |
| `erin_inv` | *(blank)* | `InventoryManager` | Warehouse stock auditor |
| `admin` | *(blank)* | `Administrator` | Superuser full access |

---

## 4. Coding Guidelines & Best Practices

### CAP Node.js Services
1. **Always Use Request Transactions**:
   * Use `const tx = cds.tx(req); await tx.run(...)` instead of global `cds.run(...)`.
2. **Never Fall Back to Default Customer Profiles**:
   * Resolve user attributes through `req.user.attr.id` or `req.user.id`. Reject with `401` or `403` if unmapped.
3. **Avoid Virtual Fields on Database Entities**:
   * Keep `db/schema.cds` focused on physical persistence. Define `virtual` fields in `srv/*.cds` projections.
4. **Enforce Atomic Stock Management**:
   * Ensure stock reservations decrement `availableQuantity` without allowing negative counts.

### SAPUI5 & Fiori Elements
1. **Avoid Deprecated API Calls**:
   * Do not use `sap.ui.getCore()`. Use `sap/ui/core/Element.getElementById(...)` or view-scoped `this.byId(...)`.
2. **Support Adaptive Content Densities**:
   * Always set `"compact": true` and `"cozy": true` in `manifest.json` for desktop and touch responsiveness.
3. **Keep Views Declarative**:
   * Utilize CDS UI annotations (`@UI.LineItem`, `@UI.HeaderInfo`, `@UI.Facets`) rather than writing manual controller code for CRUD applications.

---

## 5. Building & Packaging

### Compile UI Applications
```bash
npm run build:ui
```
Packages `app/shop-ui/webapp` into `app/shop-ui/dist/marketplace-shop.zip` and `app/admin-ui/webapp` into `app/admin-ui/dist/marketplace-admin.zip`.

### Full MTA Build
```bash
npm run build
mbt build
```
Generates production deployable archive `mta_archives/amazon-clone_1.0.0.mtar`.
