sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, Dialog, Button, VBox, Label, Input, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Addresses", {
        onInit: function () {
            // Addresses init
        },

        onOpenAddAddressDialog: function () {
            var that = this;
            if (!this._oAddAddressDialog) {
                var oName = new Input({ placeholder: "Full Name" });
                var oStreet1 = new Input({ placeholder: "Street Address or P.O. Box" });
                var oCity = new Input({ placeholder: "City" });
                var oState = new Input({ placeholder: "State / Province / Region" });
                var oPostalCode = new Input({ placeholder: "Postal Code (e.g. 98101)" });
                var oPhone = new Input({ placeholder: "Phone Number" });

                this._oAddAddressDialog = new Dialog({
                    title: "Add a New Address",
                    contentWidth: "420px",
                    content: [
                        new VBox({
                            renderType: "Bare",
                            items: [
                                new Label({ text: "Full Name (First and Last name)", required: true }),
                                oName,
                                new Label({ text: "Street Address", required: true, class: "sapUiTinyMarginTop" }),
                                oStreet1,
                                new Label({ text: "City", required: true, class: "sapUiTinyMarginTop" }),
                                oCity,
                                new Label({ text: "State", required: true, class: "sapUiTinyMarginTop" }),
                                oState,
                                new Label({ text: "Postal Code", required: true, class: "sapUiTinyMarginTop" }),
                                oPostalCode,
                                new Label({ text: "Phone Number", class: "sapUiTinyMarginTop" }),
                                oPhone
                            ]
                        }).addStyleClass("sapUiSmallMargin")
                    ],
                    beginButton: new Button({
                        text: "Add Address",
                        type: "Emphasized",
                        press: function () {
                            if (!oName.getValue() || !oStreet1.getValue() || !oCity.getValue()) {
                                MessageToast.show("Please fill in the required fields");
                                return;
                            }
                            that.setBusy(true);
                            var oCustomerModel = that.getModel("customer");
                            if (oCustomerModel) {
                                var oListBinding = oCustomerModel.bindList("/Addresses");
                                var oContext = oListBinding.create({
                                    fullName: oName.getValue(),
                                    streetName: oStreet1.getValue(),
                                    city: oCity.getValue(),
                                    stateProvince: oState.getValue() || "",
                                    postalCode: oPostalCode.getValue() || "",
                                    phone: oPhone.getValue() || "",
                                    type: "SHIPPING",
                                    isDefault: false
                                });
                                oContext.created().then(function () {
                                    that.setBusy(false);
                                    MessageToast.show("New address saved successfully");
                                    that._oAddAddressDialog.close();
                                }).catch(function (err) {
                                    that.setBusy(false);
                                    MessageBox.error(err.message || "Failed to save address");
                                });
                            } else {
                                that.setBusy(false);
                                that._oAddAddressDialog.close();
                            }
                        }
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () {
                            that._oAddAddressDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this._oAddAddressDialog);
            }
            this._oAddAddressDialog.open();
        },

        onEditAddress: function () {
            MessageToast.show("Address editor opened");
        },

        onRemoveAddress: function () {
            MessageBox.confirm("Are you sure you want to remove this address?", {
                title: "Delete Address",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        MessageToast.show("Address removed");
                    }
                }
            });
        },

        onSetDefaultAddress: function () {
            MessageToast.show("Default delivery address updated");
        }
    });
});
