sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Wishlist", {
        onInit: function () {
            this.getRouter().getRoute("wishlist").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function () {
            var oList = this.byId("wishlistItemsList");
            if (oList && oList.getBinding("items")) {
                oList.getBinding("items").refresh();
            }
        },

        onProductLinkPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("customer");
            if (oContext) {
                var sProductId = oContext.getProperty("product_ID");
                this.navTo("product", { productId: sProductId });
            }
        },

        onMoveWishlistItemToCart: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("customer");
            if (!oContext) return;

            var sProductId = oContext.getProperty("product_ID");
            var sVariantId = oContext.getProperty("variant_ID");
            var sItemId = oContext.getProperty("ID");
            var that = this;

            this.onAddToCartAction(sProductId, sVariantId, null, 1);

            // Remove from wishlist
            var oCustomerModel = this.getModel("customer");
            var oOperation = oCustomerModel.bindContext("/removeFromWishlist(...)");
            oOperation.setParameter("wishlistItem_ID", sItemId);
            oOperation.execute().then(function () {
                that._onPatternMatched();
            });
        },

        onRemoveWishlistItem: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("customer");
            if (!oContext) return;

            var sItemId = oContext.getProperty("ID");
            var oCustomerModel = this.getModel("customer");
            var that = this;
            this.setBusy(true);

            var oOperation = oCustomerModel.bindContext("/removeFromWishlist(...)");
            oOperation.setParameter("wishlistItem_ID", sItemId);

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Item removed from Wishlist");
                that._onPatternMatched();
            }).catch(function (oErr) {
                that.setBusy(false);
                MessageBox.error(oErr.message || "Failed to remove item");
            });
        },

        onAddAllToCart: function () {
            MessageToast.show("All items added to cart");
            this.refreshCartCount();
        }
    });
});
