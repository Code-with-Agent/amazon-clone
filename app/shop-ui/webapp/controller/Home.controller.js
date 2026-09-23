sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageBox"
], function (BaseController, MessageBox) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Home", {
        onInit: function () {
            // Home page initialization
        },

        onShopDeals: function () {
            this.navTo("search", {
                "?query": { q: encodeURIComponent("Deals") }
            });
        },

        onExploreCategories: function () {
            this.navTo("category", { categoryId: "cat00000-0000-0000-0000-000000000001" });
        },

        onCategoryPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (oContext) {
                var sCategoryId = oContext.getProperty("ID");
                this.navTo("category", { categoryId: sCategoryId });
            }
        },

        onCategoryPressKey: function (oEvent) {
            var sCatId = oEvent.getSource().data("catId");
            if (sCatId) {
                this.navTo("category", { categoryId: sCatId });
            } else {
                this.onExploreCategories();
            }
        },

        onSeeAllCategories: function () {
            this.navTo("category", { categoryId: "cat00000-0000-0000-0000-000000000001" });
        },

        onSeeAllFeatured: function () {
            this.navTo("search", {
                "?query": { q: encodeURIComponent("Featured") }
            });
        },

        onSeeAllDeals: function () {
            this.navTo("search", {
                "?query": { q: encodeURIComponent("Deals") }
            });
        },

        onSeeAllBestSellers: function () {
            this.navTo("search", {
                "?query": { q: encodeURIComponent("Best Sellers") }
            });
        },

        onQuickAddToCart: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (!oContext) return;

            var sProductId = oContext.getProperty("ID");
            var aVariants = oContext.getProperty("variants");
            var sVariantId = aVariants && aVariants[0] ? aVariants[0].ID : null;
            var sOfferId = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? aVariants[0].offers[0].ID : null;

            this.onAddToCartAction(sProductId, sVariantId, sOfferId, 1);
        },

        onRecentlyViewedPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("ui");
            if (oContext) {
                var sId = oContext.getProperty("id");
                if (sId) {
                    this.navTo("product", { productId: sId });
                }
            }
        },

        onJoinPrime: function () {
            MessageBox.success(
                "Welcome to Aura Prime!\n\nYour 30-day free trial has been activated.\nYou now have access to Free Express Next-Day Shipping, 5% Cashback Rewards, and exclusive early access to Lightning Deals.",
                { title: "Aura Prime Activated" }
            );
        },

        onScrollToTop: function () {
            var oPage = this.byId("homePage");
            if (oPage && oPage.scrollTo) {
                oPage.scrollTo(0, 300);
            }
        }
    });
});
