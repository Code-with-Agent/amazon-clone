sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageToast"
], function (BaseController, MessageToast) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Help", {
        onInit: function () {
            // Help init
        },

        onSendMessage: function () {
            var oInput = this.byId("helpMessageInput");
            if (!oInput || !oInput.getValue()) {
                MessageToast.show("Please write a message before sending");
                return;
            }

            MessageToast.show("Your message has been sent to Aura Customer Support. We will respond within 24 hours.");
            oInput.setValue("");
        }
    });
});
