export const ch6 = `
# Chapter 6: Storefront Frontend (SAPUI5 Freestyle)

## 6.1 Why SAPUI5 Freestyle for the B2C Storefront?
SAP provides two frontend paradigms:
1. **SAP Fiori Elements:** A metadata-driven UI framework that generates standard enterprise screens from CDS annotations.
2. **SAPUI5 Freestyle:** A component-based MVC (Model-View-Controller) framework offering full control over HTML5 DOM, custom CSS styling, complex client animations, and bespoke user flows.

For our consumer-facing Storefront (\`app/shop-ui\`), we chose **SAPUI5 Freestyle**. Consumer e-commerce requires:
* An Amazon-style dark navigation header with search suggestions and dynamic cart badge.
* Rich merchandising hero banners and carousels.
* High-density product card grids with discount badges and star rating displays.
* Multi-step consumer checkout workflows.

---

## 6.2 Component & Manifest Configuration (\`manifest.json\`)

The \`manifest.json\` file is the application descriptor in SAPUI5. It defines data sources, models, and client-side routing.

### 1. Multiple OData V4 DataSources
Notice how \`app/shop-ui/webapp/manifest.json\` connects to our microservices:

\`\`\`json
"dataSources": {
  "catalogService": {
    "uri": "/odata/v4/catalog/",
    "type": "OData",
    "settings": { "odataVersion": "4.0" }
  },
  "cartService": {
    "uri": "/odata/v4/cart/",
    "type": "OData",
    "settings": { "odataVersion": "4.0" }
  },
  "orderService": {
    "uri": "/odata/v4/order/",
    "type": "OData",
    "settings": { "odataVersion": "4.0" }
  },
  "customerService": {
    "uri": "/odata/v4/customer/",
    "type": "OData",
    "settings": { "odataVersion": "4.0" }
  }
}
\`\`\`

Each data source is instantiated into a named model:
* Default Model (\`""\`): Bound to \`catalogService\` (for browsing products, categories, search).
* \`"cart"\`: Bound to \`cartService\` (for shopping cart items and badge counter).
* \`"order"\`: Bound to \`orderService\` (for order history and checkout).
* \`"customer"\`: Bound to \`customerService\` (for address book and wishlist).

### 2. Client-Side Hash-Based Routing (17 Routes)
SAPUI5 uses declarative routing:
\`\`\`json
"routes": [
  { "name": "home", "pattern": "", "target": "home" },
  { "name": "productDetails", "pattern": "product/{productId}", "target": "productDetails" },
  { "name": "cart", "pattern": "cart", "target": "cart" },
  { "name": "checkout", "pattern": "checkout", "target": "checkout" },
  { "name": "orders", "pattern": "orders", "target": "orders" }
]
\`\`\`
When the browser URL hash changes to \`#/product/prod-001\`, the router automatically displays the \`ProductDetails.view.xml\` view and triggers \`ProductDetails.controller.js\`.

---

## 6.3 Critical SAPUI5 OData V4 Binding Gotcha

> [!WARNING]
> **The Paging Trap: Never put \`$top\` or \`$skip\` inside \`parameters: { ... }\` in SAPUI5 OData V4!**

### The Bug That Broke the Storefront:
In \`Home.view.xml\`, our featured product grid was originally declared like this:
\`\`\`xml
<!-- WRONG - DO NOT DO THIS IN ODATA V4! -->
<grid:CSSGrid items="{
    path: '/Products',
    parameters: {
        '$filter': 'isFeatured eq true',
        '$top': 4,
        '$skip': 0
    }
}">
\`\`\`

### Why It Failed:
In SAPUI5 OData V4, paging is managed internally by the \`ODataListBinding\` class. If you pass \`$top\` or \`$skip\` inside \`parameters\`, the UI5 framework throws a fatal, unhandled exception:
\`\`\`
Error: System query option $top is not supported - sap.ui.model.odata.v4.ODataListBinding
\`\`\`
This crashed the SAPUI5 router, aborting the view initialization before anything rendered on screen!

### The Correct SAPUI5 OData V4 Pattern:
Declare \`length\` and \`startIndex\` as top-level properties on the binding definition:
\`\`\`xml
<!-- CORRECT - Standard SAPUI5 OData V4 Binding -->
<grid:CSSGrid items="{
    path: '/Products',
    length: 4,
    startIndex: 0,
    parameters: {
        '$filter': 'isFeatured eq true',
        '$expand': 'variants($expand=offers),images'
    }
}">
\`\`\`
In addition, configure \`"autoExpandSelect": false\` in \`manifest.json\` for freestyle models to prevent UI5 from rewriting freestyle XML view bindings into malformed requests.

---

## 6.4 Reusable UI Components: Fragments & BaseController

### 1. XML Fragments for DRY (Don't Repeat Yourself) UI
In \`app/shop-ui/webapp/view/fragments/\`, we built modular UI components:
* \`ProductCard.fragment.xml\`: Encapsulates the product thumbnail, price badge, rating stars, and "Add to Cart" button. Reused across Home, Search Results, and Category pages.
* \`CartSummary.fragment.xml\`: Displays subtotal, tax, shipping, coupon input, and "Proceed to Checkout" button. Reused in Cart and Checkout views.

### 2. BaseController Pattern
Instead of duplicating helper methods across 17 controllers, \`BaseController.js\` provides common utilities:
\`\`\`javascript
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "marketplace/shop/model/formatter"
], function (Controller, UIComponent, formatter) {
    "use strict";

    return Controller.extend("marketplace.shop.controller.BaseController", {
        formatter: formatter,

        getModel: function (sName) {
            return this.getView().getModel(sName) || this.getOwnerComponent().getModel(sName);
        },

        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        navTo: function (sRoute, mData) {
            this.getRouter().navTo(sRoute, mData);
        }
    });
});
\`\`\`
`;
