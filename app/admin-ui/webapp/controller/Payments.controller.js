sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Payments", {
        onPaymentPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sPaymentId = oContext.getProperty("ID");
                this.navTo("paymentDetail", { paymentId: sPaymentId });
            }
        },

        onRefresh: function () {
            var oTable = this.byId("paymentsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Payments refreshed");
        }
    });
});
