sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageToast"
], function (BaseController, MessageToast) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Reviews", {
        onInit: function () {
            this.getRouter().getRoute("reviews").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            this._sProductId = oEvent.getParameter("arguments").productId;
        },

        onBackToProduct: function () {
            if (this._sProductId) {
                this.navTo("product", { productId: this._sProductId });
            } else {
                this.onNavHome();
            }
        },

        onWriteReview: function () {
            if (this._sProductId) {
                this.navTo("product", { productId: this._sProductId });
            }
        },

        onHelpfulVote: function () {
            MessageToast.show("Marked as helpful. Thank you for voting!");
        }
    });
});
