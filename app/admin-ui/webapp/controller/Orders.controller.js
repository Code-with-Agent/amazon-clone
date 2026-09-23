sap.ui.define([
    "marketplace/admin/controller/BaseAdminController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseAdminController, Filter, FilterOperator) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Orders", {
        onOrderPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sOrderId = oContext.getProperty("ID");
                this.navTo("orderDetail", { orderId: sOrderId });
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("ordersTable");
            var oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("orderNumber", FilterOperator.Contains, sQuery)
            ];
            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },

        onRefresh: function () {
            var oTable = this.byId("ordersTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Orders refreshed");
        }
    });
});
