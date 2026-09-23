sap.ui.define([
    "marketplace/admin/controller/BaseAdminController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseAdminController, Filter, FilterOperator) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Inventory", {
        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("inventoryTable");
            var oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("variant/variantSku", FilterOperator.Contains, sQuery),
                new Filter("warehouse/name", FilterOperator.Contains, sQuery)
            ];
            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },

        onRefresh: function () {
            var oTable = this.byId("inventoryTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Inventory stock refreshed");
        },

        onAuditStock: function () {
            this.showSuccess("Physical cycle count initiated");
        }
    });
});
