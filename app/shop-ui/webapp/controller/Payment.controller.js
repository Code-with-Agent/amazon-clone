sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageToast"
], function (BaseController, MessageToast) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Payment", {
        onInit: function () {
            this.getRouter().getRoute("payment").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            this._sOrderId = oEvent.getParameter("arguments").orderId;
        },

        onAuthorizePayment: function () {
            var that = this;
            this.setBusy(true);
            setTimeout(function () {
                that.setBusy(false);
                MessageToast.show("Payment authorized successfully");
                that.navTo("orderConfirmation", { orderId: that._sOrderId || "ord-recent" });
            }, 800);
        },

        onCancelPayment: function () {
            this.onNavBack();
        }
    });
});
