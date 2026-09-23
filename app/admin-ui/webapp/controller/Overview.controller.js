sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Overview", {
        onRefreshData: function () {
            this.showSuccess("Operational data refreshed");
            var oModel = this.getModel();
            if (oModel) {
                oModel.refresh();
            }
        },

        onNavigateProducts: function () { this.navTo("products"); },
        onNavigateOrders: function () { this.navTo("orders"); },
        onNavigateCustomers: function () { this.navTo("customers"); },
        onNavigateInventory: function () { this.navTo("inventory"); },
        onNavigateSellers: function () { this.navTo("sellers"); },
        onNavigatePromotions: function () { this.navTo("promotions"); },
        onNavigateReviews: function () { this.navTo("reviews"); },
        onNavigatePayments: function () { this.navTo("payments"); },
        onNavigateShipments: function () { this.navTo("shipments"); }
    });
});
