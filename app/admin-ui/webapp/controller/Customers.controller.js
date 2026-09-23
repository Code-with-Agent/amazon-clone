sap.ui.define([
    "marketplace/admin/controller/BaseAdminController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseAdminController, Filter, FilterOperator) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Customers", {
        onCustomerPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sCustomerId = oContext.getProperty("ID");
                this.navTo("customerDetail", { customerId: sCustomerId });
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("customersTable");
            var oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("firstName", FilterOperator.Contains, sQuery),
                new Filter("lastName", FilterOperator.Contains, sQuery),
                new Filter("email", FilterOperator.Contains, sQuery)
            ];
            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },

        onRefresh: function () {
            var oTable = this.byId("customersTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Customers refreshed");
        }
    });
});
