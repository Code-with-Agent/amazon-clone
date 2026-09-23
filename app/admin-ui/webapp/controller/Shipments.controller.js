sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Shipments", {
        onShipmentPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sShipmentId = oContext.getProperty("ID");
                this.navTo("shipmentDetail", { shipmentId: sShipmentId });
            }
        },

        onRefresh: function () {
            var oTable = this.byId("shipmentsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Shipments refreshed");
        }
    });
});
