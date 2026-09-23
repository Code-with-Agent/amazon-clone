sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.ShipmentDetail", {
        onInit: function () {
            this.getRouter().getRoute("shipmentDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sShipmentId = oEvent.getParameter("arguments").shipmentId;
            if (!sShipmentId) return;
            this._sShipmentId = sShipmentId;

            var sPath = "/Shipments(" + sShipmentId + ")";
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "order,warehouse"
                }
            });
        },

        onSetInTransit: function () {
            this._updateStatus("IN_TRANSIT");
        },

        onSetDelivered: function () {
            this._updateStatus("DELIVERED");
        },

        _updateStatus: function (sStatus) {
            var that = this;
            var oModel = this.getModel();
            var oOperation = oModel.bindContext("/updateShipmentStatus(...)");
            oOperation.setParameter("shipment_ID", this._sShipmentId);
            oOperation.setParameter("status", sStatus);

            this.setBusy(true);
            oOperation.execute().then(function () {
                that.setBusy(false);
                that.showSuccess("Shipment status updated to: " + sStatus);
                that.getView().getElementBinding().refresh();
            }).catch(function (oErr) {
                that.setBusy(false);
                that.showError(oErr.message || "Failed to update shipment status");
            });
        }
    });
});
