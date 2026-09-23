sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageToast"
], function (BaseController, MessageToast) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Login", {
        onInit: function () {
            // Login init
        },

        onSignIn: function () {
            var oUI = this.getModel("ui");
            oUI.setProperty("/isLoggedIn", true);
            MessageToast.show("Welcome back, " + oUI.getProperty("/userDisplayName") + "!");
            this.navTo("home");
        },

        onForgotPass: function () {
            MessageToast.show("Password reset link sent to registered email address.");
        },

        onSelectDemoPersona: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            var oUI = this.getModel("ui");

            var oPersonas = {
                alice: {
                    name: "Alice Smith",
                    email: "alice.smith@example.com",
                    city: "Seattle",
                    zip: "98101"
                },
                bob: {
                    name: "Bob Jones",
                    email: "bob.jones@example.com",
                    city: "Austin",
                    zip: "78701"
                },
                carol: {
                    name: "Carol Davis",
                    email: "carol.davis@example.com",
                    city: "San Francisco",
                    zip: "94105"
                }
            };

            var oSelected = oPersonas[sKey] || oPersonas.alice;
            oUI.setProperty("/userDisplayName", oSelected.name);
            oUI.setProperty("/userEmail", oSelected.email);
            oUI.setProperty("/deliveryCity", oSelected.city);
            oUI.setProperty("/deliveryPostalCode", oSelected.zip);

            MessageToast.show("Switched active persona to " + oSelected.name);
        }
    });
});
