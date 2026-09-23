sap.ui.define([
    "marketplace/admin/controller/BaseAdminController"
], function (BaseAdminController) {
    "use strict";

    return BaseAdminController.extend("marketplace.admin.controller.PromotionDetail", {
        onInit: function () {
            this.getRouter().getRoute("promotionDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sPromotionId = oEvent.getParameter("arguments").promotionId;
            if (!sPromotionId) return;

            var sPath = "/Promotions(" + sPromotionId + ")";
            this.getView().bindElement({
                path: sPath
            });
        }
    });
});
