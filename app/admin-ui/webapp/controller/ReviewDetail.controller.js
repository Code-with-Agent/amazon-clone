sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.ReviewDetail", {
        onInit: function () {
            this.getRouter().getRoute("reviewDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sReviewId = oEvent.getParameter("arguments").reviewId;
            if (!sReviewId) return;
            this._sReviewId = sReviewId;

            var sPath = "/Reviews(" + sReviewId + ")";
            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "product,customer"
                }
            });
        },

        onApproveReview: function () {
            this._moderate("APPROVED");
        },

        onRejectReview: function () {
            this._moderate("REJECTED");
        },

        _moderate: function (sStatus) {
            var that = this;
            var oModel = this.getModel();
            var oOperation = oModel.bindContext("/moderateReview(...)");
            oOperation.setParameter("review_ID", this._sReviewId);
            oOperation.setParameter("status", sStatus);

            this.setBusy(true);
            oOperation.execute().then(function () {
                that.setBusy(false);
                that.showSuccess("Review status updated to: " + sStatus);
                that.getView().getElementBinding().refresh();
            }).catch(function (oErr) {
                that.setBusy(false);
                that.showError(oErr.message || "Failed to moderate review");
            });
        }
    });
});
