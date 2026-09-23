sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Sellers", {
        onSellerPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sSellerId = oContext.getProperty("ID");
                this.navTo("sellerDetail", { sellerId: sSellerId });
            }
        },

        onRefresh: function () {
            var oTable = this.byId("sellersTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Sellers refreshed");
        }
    });
});
