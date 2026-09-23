sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.App", {
        onInit: function () {
            this.getRouter().attachRouteMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
            var sRouteName = oEvent.getParameter("name");
            var oAdminState = this.getOwnerComponent().getModel("adminState");

            if (sRouteName.indexOf("product") === 0) {
                oAdminState.setProperty("/activeTab", "products");
            } else if (sRouteName.indexOf("order") === 0) {
                oAdminState.setProperty("/activeTab", "orders");
            } else if (sRouteName.indexOf("customer") === 0) {
                oAdminState.setProperty("/activeTab", "customers");
            } else if (sRouteName.indexOf("inventory") === 0) {
                oAdminState.setProperty("/activeTab", "inventory");
            } else if (sRouteName.indexOf("seller") === 0) {
                oAdminState.setProperty("/activeTab", "sellers");
            } else if (sRouteName.indexOf("promotion") === 0) {
                oAdminState.setProperty("/activeTab", "promotions");
            } else if (sRouteName.indexOf("review") === 0) {
                oAdminState.setProperty("/activeTab", "reviews");
            } else if (sRouteName.indexOf("payment") === 0) {
                oAdminState.setProperty("/activeTab", "payments");
            } else if (sRouteName.indexOf("shipment") === 0) {
                oAdminState.setProperty("/activeTab", "shipments");
            } else {
                oAdminState.setProperty("/activeTab", "overview");
            }
        },

        onNavTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            this.navTo(sKey);
        }
    });
});
