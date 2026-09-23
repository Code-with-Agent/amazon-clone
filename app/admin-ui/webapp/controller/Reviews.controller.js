sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.Reviews", {
        onReviewPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem") || oEvent.getSource();
            var oContext = oItem.getBindingContext();
            if (oContext) {
                var sReviewId = oContext.getProperty("ID");
                this.navTo("reviewDetail", { reviewId: sReviewId });
            }
        },

        onRefresh: function () {
            var oTable = this.byId("reviewsTable");
            var oBinding = oTable.getBinding("items");
            if (oBinding) oBinding.refresh();
            this.showSuccess("Reviews refreshed");
        }
    });
});
