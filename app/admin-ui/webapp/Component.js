sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
    "use strict";

    return UIComponent.extend("marketplace.admin.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // Set device model
            var oDeviceModel = new JSONModel(Device);
            oDeviceModel.setDefaultBindingMode("OneWay");
            this.setModel(oDeviceModel, "device");

            // Set global administrative UI state model
            var oAdminState = new JSONModel({
                activeTab: "overview",
                userName: "Operations Lead (Admin)",
                systemStatus: "ONLINE",
                environment: "Development (SQLite / OData V4)",
                notificationsCount: 4
            });
            this.setModel(oAdminState, "adminState");

            // Enable routing
            this.getRouter().initialize();
        }
    });
});
