sap.ui.define([
    "marketplace/shop/controller/BaseController"
], function (BaseController) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.App", {
        onInit: function () {
            this.getView().addStyleClass(this.getOwnerComponent().getContentDensityClass());
        },

        onSuggestionItemPress: function (oEvent) {
            var oItem = oEvent.getParameter("listItem");
            if (oItem) {
                var sTitle = oItem.getTitle();
                var oSearchField = this.byId("headerSearchField");
                if (oSearchField) {
                    oSearchField.setValue(sTitle);
                }
                this.navTo("search", {
                    query: {
                        q: encodeURIComponent(sTitle)
                    }
                });
                this.onCloseSuggestions();
            }
        },

        onCloseSuggestions: function () {
            if (this._oSuggestionsPopover) {
                this._oSuggestionsPopover.close();
            }
        },

        onScrollToTop: function () {
            var oNavContainer = this.byId("appControl");
            if (oNavContainer) {
                var oCurrentPage = oNavContainer.getCurrentPage();
                if (oCurrentPage && oCurrentPage.scrollTo) {
                    oCurrentPage.scrollTo(0, 300);
                }
            }
        }
    });
});
