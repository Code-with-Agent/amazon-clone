sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/Element",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "marketplace/shop/model/formatter"
], function (Controller, History, Element, MessageToast, MessageBox, formatter) {
    "use strict";

    return Controller.extend("marketplace.shop.controller.BaseController", {
        formatter: formatter,

        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        getModel: function (sName) {
            return this.getView().getModel(sName) || this.getOwnerComponent().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        getText: function (sKey, aArgs) {
            return this.getResourceBundle().getText(sKey, aArgs);
        },

        navTo: function (sName, oParameters, bReplace) {
            this.getRouter().navTo(sName, oParameters, undefined, bReplace);
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("home", {}, undefined, true);
            }
        },

        // Navigation Shortcuts
        onNavHome: function () {
            this.navTo("home");
        },

        onNavCart: function () {
            this.navTo("cart");
        },

        onNavOrders: function () {
            this.navTo("orders");
        },

        onNavAccount: function () {
            this.navTo("account");
        },

        onNavAddresses: function () {
            this.navTo("addresses");
        },

        onNavWishlist: function () {
            this.navTo("wishlist");
        },

        onNavHelp: function () {
            this.navTo("help");
        },

        onNavLogin: function () {
            this.navTo("login");
        },

        onSearchPress: function (oEvent) {
            var sQuery = "";
            if (oEvent.getParameter) {
                sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            }
            if (!sQuery) {
                var oSearchField = this.byId("headerSearchField") || Element.getElementById("headerSearchField");
                if (oSearchField) {
                    sQuery = oSearchField.getValue();
                }
            }
            this.navTo("search", {
                "?query": {
                    q: encodeURIComponent(sQuery || "")
                }
            });
        },

        onCategoryNavSelect: function (oEvent) {
            var sKey = oEvent.getSource().data("categoryKey") || oEvent.getSource().getSelectedKey();
            if (sKey && sKey !== "all") {
                this.navTo("category", { categoryId: sKey });
            } else {
                this.navTo("home");
            }
        },

        onProductCardPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (oContext) {
                var sProductId = oContext.getProperty("ID");
                this.navTo("product", { productId: sProductId });
            }
        },

        onAddToCartAction: function (sProductId, sVariantId, sOfferId, iQty) {
            var that = this;
            var oCartModel = this.getOwnerComponent().getModel("cart");
            if (!oCartModel) return;

            var iQuantity = parseInt(iQty, 10) || 1;
            this.setBusy(true);

            var oOperation = oCartModel.bindContext("/addToCart(...)");
            oOperation.setParameter("product_ID", sProductId);
            if (sVariantId) oOperation.setParameter("variant_ID", sVariantId);
            if (sOfferId) oOperation.setParameter("offer_ID", sOfferId);
            oOperation.setParameter("quantity", iQuantity);

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Added to Cart successfully");
                that.refreshCartCount();
            }).catch(function (oError) {
                that.setBusy(false);
                var sMsg = oError.message || "Failed to add item to Cart";
                MessageBox.error(sMsg);
            });
        },

        onAddToWishlistAction: function (sProductId, sVariantId) {
            var that = this;
            var oCustomerModel = this.getOwnerComponent().getModel("customer");
            if (!oCustomerModel) return;

            this.setBusy(true);
            var oOperation = oCustomerModel.bindContext("/addToWishlist(...)");
            oOperation.setParameter("product_ID", sProductId);
            if (sVariantId) oOperation.setParameter("variant_ID", sVariantId);

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Added to your Wishlist");
            }).catch(function (oError) {
                that.setBusy(false);
                var sMsg = oError.message || "Failed to add item to Wishlist";
                MessageBox.error(sMsg);
            });
        },

        refreshCartCount: function () {
            var oComponent = this.getOwnerComponent();
            if (oComponent && typeof oComponent._syncCartCount === "function") {
                oComponent._syncCartCount();
            }
        },

        setBusy: function (bBusy) {
            var oUIModel = this.getOwnerComponent().getModel("ui");
            if (oUIModel) {
                oUIModel.setProperty("/busy", !!bBusy);
            }
        },

        showSuccessMessage: function (sMsg) {
            MessageToast.show(sMsg);
        },

        showErrorMessage: function (sError) {
            MessageBox.error(sError);
        }
    });
});
