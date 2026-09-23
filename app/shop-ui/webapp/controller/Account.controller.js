sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageToast"
], function (BaseController, MessageToast) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Account", {
        onInit: function () {
            // Account init
        },

        onNavPaymentHub: function () {
            this.navTo("payment", { orderId: "manage" });
        },

        onNavLoginSecurity: function () {
            this.navTo("login");
        },

        onSignOut: function () {
            var oUI = this.getModel("ui");
            oUI.setProperty("/isLoggedIn", false);
            MessageToast.show("Signed out of Aura Marketplace");
            this.navTo("login");
        }
    });
});
