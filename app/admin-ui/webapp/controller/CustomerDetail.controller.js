sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.CustomerDetail", {
        onInit: function () {
            this.getRouter().getRoute("customerDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sCustomerId = oEvent.getParameter("arguments").customerId;
            if (!sCustomerId) return;

            var sPath = "/Customers(" + sCustomerId + ")";
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "addresses,orders,reviews"
                }
            });
        },

        onSuspendCustomer: function () {
            this.showSuccess("Customer status set to SUSPENDED");
        }
    });
});
