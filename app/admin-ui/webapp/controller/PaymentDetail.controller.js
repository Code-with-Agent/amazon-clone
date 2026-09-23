sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.PaymentDetail", {
        onInit: function () {
            this.getRouter().getRoute("paymentDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sPaymentId = oEvent.getParameter("arguments").paymentId;
            if (!sPaymentId) return;

            var sPath = "/Payments(" + sPaymentId + ")";
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "order"
                }
            });
        }
    });
});
