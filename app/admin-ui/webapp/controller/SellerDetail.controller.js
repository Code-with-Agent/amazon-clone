sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.SellerDetail", {
        onInit: function () {
            this.getRouter().getRoute("sellerDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sSellerId = oEvent.getParameter("arguments").sellerId;
            if (!sSellerId) return;
            this._sSellerId = sSellerId;

            var sPath = "/Sellers(" + sSellerId + ")";
            this.getView().bindElement({
                path: sPath
            });
        },

        onApproveSeller: function () {
            var that = this;
            var oModel = this.getModel();
            var oOperation = oModel.bindContext("/approveSeller(...)");
            oOperation.setParameter("seller_ID", this._sSellerId);

            this.setBusy(true);
            oOperation.execute().then(function () {
                that.setBusy(false);
                that.showSuccess("Seller partner approved successfully!");
                that.getView().getElementBinding().refresh();
            }).catch(function (oErr) {
                that.setBusy(false);
                that.showError(oErr.message || "Failed to approve seller");
            });
        },

        onSuspendSeller: function () {
            this.showSuccess("Seller suspended");
        }
    });
});
