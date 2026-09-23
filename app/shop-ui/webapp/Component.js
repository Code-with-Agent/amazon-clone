sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "marketplace/shop/model/models"
], function (UIComponent, JSONModel, models) {
    "use strict";

    return UIComponent.extend("marketplace.shop.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Set the device model
            this.setModel(models.createDeviceModel(), "device");

            // Set global UI state model
            var oUIModel = new JSONModel({
                cartCount: 0,
                searchQuery: "",
                selectedCategory: "all",
                isLoggedIn: true,
                userDisplayName: "Alice Smith",
                userEmail: "alice.smith@example.com",
                deliveryPostalCode: "98101",
                deliveryCity: "Seattle",
                busy: false,
                recentlyViewed: []
            });
            this.setModel(oUIModel, "ui");

            // Enable routing
            this.getRouter().initialize();

            // Initial cart count sync
            this._syncCartCount();
        },

        _syncCartCount: function () {
            var oCartModel = this.getModel("cart");
            var oUIModel = this.getModel("ui");
            if (oCartModel) {
                var oListBinding = oCartModel.bindList("/CartItems");
                oListBinding.requestContexts(0, 100).then(function (aContexts) {
                    var iTotalCount = 0;
                    if (aContexts && aContexts.length > 0) {
                        aContexts.forEach(function (oCtx) {
                            var oData = oCtx.getObject();
                            iTotalCount += (oData.quantity || 1);
                        });
                    }
                    oUIModel.setProperty("/cartCount", iTotalCount);
                }).catch(function () {
                    // Fallback to 0 on unauthenticated / network error
                    oUIModel.setProperty("/cartCount", 0);
                });
            }
        },

        getContentDensityClass: function () {
            if (!this._sContentDensityClass) {
                if (sap.ui.Device.support.touch) {
                    this._sContentDensityClass = "sapUiSizeCozy";
                } else {
                    this._sContentDensityClass = "sapUiSizeCompact";
                }
            }
            return this._sContentDensityClass;
        }
    });
});
