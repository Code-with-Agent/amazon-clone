sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.ProductDetail", {
        onInit: function () {
            this.getRouter().getRoute("productDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sProductId = oEvent.getParameter("arguments").productId;
            if (!sProductId) return;

            var sPath = "/Products(" + sProductId + ")";
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "category,variants,images,reviews"
                }
            });
        },

        onEditDraft: function () {
            this.showSuccess("Draft lock initiated for product edits");
        },

        onDiscontinue: function () {
            this.showSuccess("Status changed to DISCONTINUED");
        },

        onInspectInventory: function () {
            this.navTo("inventory");
        },

        onInspectSellers: function () {
            this.navTo("sellers");
        }
    });
});
