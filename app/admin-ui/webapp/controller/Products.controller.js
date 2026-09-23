sap.ui.define([
    "marketplace/admin/controller/BaseAdminController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseAdminController, Filter, FilterOperator) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Products", {
        onProductPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sProductId = oContext.getProperty("ID");
                this.navTo("productDetail", { productId: sProductId });
            }
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("productsTable");
            var oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var aFilters = [
                new Filter("title", FilterOperator.Contains, sQuery),
                new Filter("sku", FilterOperator.Contains, sQuery),
                new Filter("brand", FilterOperator.Contains, sQuery)
            ];
            oBinding.filter(new Filter({ filters: aFilters, and: false }));
        },

        onRefresh: function () {
            var oTable = this.byId("productsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Catalog refreshed");
        },

        onCreateProduct: function () {
            this.showSuccess("Opening Draft Product Creation...");
        },

        onFilterPress: function () {
            this.showSuccess("Opening Filter Dialog");
        }
    });
});
