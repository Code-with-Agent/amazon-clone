sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Promotions", {
        onPromotionPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sPromotionId = oContext.getProperty("ID");
                this.navTo("promotionDetail", { promotionId: sPromotionId });
            }
        },

        onRefresh: function () {
            var oTable = this.byId("promotionsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Promotions refreshed");
        }
    });
});
