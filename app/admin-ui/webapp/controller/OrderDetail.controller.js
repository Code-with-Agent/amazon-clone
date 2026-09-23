sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.OrderDetail", {
        onInit: function () {
            this.getRouter().getRoute("orderDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sOrderId = oEvent.getParameter("arguments").orderId;
            if (!sOrderId) return;
            this._sOrderId = sOrderId;

            var sPath = "/Orders(" + sOrderId + ")";
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "customer,shippingAddress,items,payment,shipments,history"
                }
            });
        },

        onFulfillShipment: function () {
            var that = this;
            var oModel = this.getModel();
            var oOperation = oModel.bindContext("/fulfillShipment(...)");

            oOperation.setParameter("order_ID", this._sOrderId);
            oOperation.setParameter("carrier", "FEDEX_PRIORITY");
            oOperation.setParameter("trackingNumber", "FDX-" + Date.now().toString().slice(-8));

            this.setBusy(true);
            oOperation.execute().then(function () {
                that.setBusy(false);
                that.showSuccess("Shipment fulfilled and tracking generated!");
                that.getView().getElementBinding().refresh();
            }).catch(function (oErr) {
                that.setBusy(false);
                that.showError(oErr.message || "Failed to fulfill shipment");
            });
        }
    });
});
