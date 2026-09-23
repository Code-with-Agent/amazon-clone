sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Checkout", {
        onInit: function () {
            var oCheckoutState = new JSONModel({
                selectedAddressId: null,
                selectedAddressSummary: "123 Pike Street, Seattle, WA 98101",
                deliveryMethod: "STANDARD",
                deliverySummary: "Standard Shipping (3-5 business days) - FREE",
                paymentMethod: "CREDIT_CARD",
                paymentSummary: "Credit Card (Mock Payment)"
            });
            this.setModel(oCheckoutState, "checkoutState");

            this.getRouter().getRoute("checkout").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function () {
            // Load ActiveCart for financial summary
            var oCartModel = this.getModel("cart");
            var that = this;
            if (oCartModel) {
                var oList = oCartModel.bindList("/ActiveCart");
                oList.requestContexts(0, 1).then(function (aContexts) {
                    if (aContexts && aContexts[0]) {
                        that.getView().bindElement({
                            model: "cart",
                            path: aContexts[0].getPath()
                        });
                    }
                });
            }

            // Pre-select default shipping address
            var oCustomerModel = this.getModel("customer");
            if (oCustomerModel) {
                var oAddrList = oCustomerModel.bindList("/Addresses");
                oAddrList.requestContexts(0, 5).then(function (aContexts) {
                    if (aContexts && aContexts.length > 0) {
                        var oDefault = aContexts.find(function (c) {
                            return c.getProperty("isDefault") === true;
                        }) || aContexts[0];

                        that.getModel("checkoutState").setProperty("/selectedAddressId", oDefault.getProperty("ID"));
                        that.getModel("checkoutState").setProperty(
                            "/selectedAddressSummary",
                            (oDefault.getProperty("streetName") || oDefault.getProperty("street1") || "") + ", " + oDefault.getProperty("city") + " " + oDefault.getProperty("postalCode")
                        );
                    }
                });
            }

            // Reset wizard to step 1
            var oWizard = this.byId("checkoutWizard");
            if (oWizard) {
                var oStep1 = this.byId("stepShippingAddress");
                if (oStep1) {
                    oWizard.discardProgress(oStep1);
                }
            }
        },

        // =========================================================
        // STEP 1 VALIDATION & HANDLING
        // =========================================================
        onSelectShippingAddress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("customer");
            if (oContext) {
                var sId = oContext.getProperty("ID");
                var sSummary = (oContext.getProperty("streetName") || oContext.getProperty("street1") || "") + ", " + oContext.getProperty("city") + " " + oContext.getProperty("postalCode");
                this.getModel("checkoutState").setProperty("/selectedAddressId", sId);
                this.getModel("checkoutState").setProperty("/selectedAddressSummary", sSummary);
                MessageToast.show("Delivery address selected");
            }
        },

        onConfirmAddressStep: function () {
            var sAddrId = this.getModel("checkoutState").getProperty("/selectedAddressId");
            if (!sAddrId) {
                MessageBox.warning("Please select a valid delivery address before proceeding.");
                return;
            }

            var oStep = this.byId("stepShippingAddress");
            var oWizard = this.byId("checkoutWizard");
            oStep.setValidated(true);
            oWizard.nextStep();
        },

        onStepAddressActivate: function () {
            // Address step activated
        },

        onAddNewAddress: function () {
            this.navTo("addresses");
        },

        // =========================================================
        // STEP 2 VALIDATION & HANDLING
        // =========================================================
        onDeliveryMethodSelect: function (oEvent) {
            var iIndex = oEvent.getParameter("selectedIndex");
            var aSpeeds = ["STANDARD", "EXPEDITED", "NEXT_DAY"];
            var aLabels = [
                "Standard Shipping (3-5 business days) - FREE",
                "Expedited Delivery (2 business days) - $9.99",
                "Priority Next-Day Express Delivery - $19.99"
            ];

            var sSpeed = aSpeeds[iIndex] || "STANDARD";
            this.getModel("checkoutState").setProperty("/deliveryMethod", sSpeed);
            this.getModel("checkoutState").setProperty("/deliverySummary", aLabels[iIndex]);
        },

        onConfirmDeliveryStep: function () {
            var oStep = this.byId("stepDeliveryMethod");
            var oWizard = this.byId("checkoutWizard");
            oStep.setValidated(true);
            oWizard.nextStep();
        },

        onStepDeliveryActivate: function () {
            // Delivery step activated
        },

        // =========================================================
        // STEP 3 VALIDATION & PAYMENT HANDLING
        // =========================================================
        onPaymentMethodChange: function (oEvent) {
            var iIndex = oEvent.getParameter("selectedIndex");
            var aMethods = [
                "CREDIT_CARD",
                "DEBIT_CARD",
                "UPI",
                "NET_BANKING",
                "WALLET",
                "CASH_ON_DELIVERY"
            ];
            var aLabels = [
                "Credit Card",
                "Debit Card",
                "UPI / Instant Pay",
                "Net Banking",
                "Digital Wallet",
                "Cash on Delivery (COD)"
            ];

            var sMethod = aMethods[iIndex] || "CREDIT_CARD";
            this.getModel("checkoutState").setProperty("/paymentMethod", sMethod);
            this.getModel("checkoutState").setProperty("/paymentSummary", aLabels[iIndex]);

            // Toggle form containers
            this.byId("creditCardFormContainer").setVisible(sMethod === "CREDIT_CARD");
            this.byId("debitCardFormContainer").setVisible(sMethod === "DEBIT_CARD");
            this.byId("upiFormContainer").setVisible(sMethod === "UPI");
            this.byId("netBankingFormContainer").setVisible(sMethod === "NET_BANKING");
            this.byId("walletFormContainer").setVisible(sMethod === "WALLET");
            this.byId("codFormContainer").setVisible(sMethod === "CASH_ON_DELIVERY");
        },

        onVerifyUPI: function () {
            var oInput = this.byId("upiIdInput");
            var sVpa = oInput ? oInput.getValue().trim() : "";
            if (!sVpa || !sVpa.includes("@")) {
                MessageBox.error("Please enter a valid UPI ID (e.g. username@okhdfcbank)");
                return;
            }
            MessageToast.show("UPI ID verified successfully (Aura Mock Provider)");
        },

        onConfirmPaymentStep: function () {
            var sMethod = this.getModel("checkoutState").getProperty("/paymentMethod");

            // Validate based on payment method
            if (sMethod === "CREDIT_CARD") {
                var oCcNum = this.byId("checkoutCardNumberInput");
                if (oCcNum && oCcNum.getValue() && oCcNum.getValue().length < 4) {
                    MessageBox.warning("Please enter a valid card number.");
                    return;
                }
            } else if (sMethod === "UPI") {
                var oVpa = this.byId("upiIdInput");
                if (oVpa && oVpa.getValue() && !oVpa.getValue().includes("@")) {
                    MessageBox.warning("Please enter a valid UPI ID.");
                    return;
                }
            }

            var oStep = this.byId("stepPaymentMethod");
            var oWizard = this.byId("checkoutWizard");
            oStep.setValidated(true);
            oWizard.nextStep();
        },

        onStepPaymentActivate: function () {
            // Payment step activated
        },

        // =========================================================
        // STEP 4 VALIDATION & REVIEW
        // =========================================================
        onStepReviewActivate: function () {
            var oState = this.getModel("checkoutState");
            var oReviewAddr = this.byId("reviewAddressText");
            var oReviewDeliv = this.byId("reviewDeliveryText");
            var oReviewPay = this.byId("reviewPaymentText");

            if (oReviewAddr) oReviewAddr.setText(oState.getProperty("/selectedAddressSummary"));
            if (oReviewDeliv) oReviewDeliv.setText(oState.getProperty("/deliverySummary"));
            if (oReviewPay) oReviewPay.setText(oState.getProperty("/paymentSummary"));
        },

        onConfirmReviewStep: function () {
            var oStep = this.byId("stepOrderReview");
            var oWizard = this.byId("checkoutWizard");
            oStep.setValidated(true);
            oWizard.nextStep();
        },

        onWizardCompleted: function () {
            // Wizard reaches final step
        },

        // =========================================================
        // STEP 5: FINAL ORDER SUBMISSION (checkout action)
        // =========================================================
        onPlaceOrderFinal: function () {
            var that = this;
            var oState = this.getModel("checkoutState");
            var sAddressId = oState.getProperty("/selectedAddressId") || "addr0000-0000-0000-0000-000000000001";
            var sPaymentMethod = oState.getProperty("/paymentMethod") || "CREDIT_CARD";

            // Check simulation outcome (Success vs Failure)
            var oSimRadio = this.byId("simulationOutcomeGroup");
            var sSimOutcome = "SUCCESS";
            if (oSimRadio && oSimRadio.getSelectedButton()) {
                sSimOutcome = oSimRadio.getSelectedButton().data("outcomeKey") ||
                    (oSimRadio.getSelectedIndex() === 1 ? "FAIL" : "SUCCESS");
            }

            this.setBusy(true);
            var oOrderModel = this.getModel("order");
            var oOperation = oOrderModel.bindContext("/checkout(...)");

            oOperation.setParameter("shippingAddress_ID", sAddressId);
            oOperation.setParameter("billingAddress_ID", sAddressId);
            oOperation.setParameter("paymentMethod", sPaymentMethod);
            oOperation.setParameter("paymentToken", sSimOutcome === "FAIL" ? "fail" : "tok_mock_secure_2026");
            oOperation.setParameter("simulateOutcome", sSimOutcome);

            oOperation.execute().then(function () {
                that.setBusy(false);
                var oResult = oOperation.getBoundContext().getObject();
                that.refreshCartCount();

                var sOrderId = oResult && oResult.order_ID ? oResult.order_ID : "ord-recent";
                MessageToast.show("Order successfully placed!");
                that.navTo("orderConfirmation", { orderId: sOrderId });
            }).catch(function (oError) {
                that.setBusy(false);
                var sErrMsg = oError.message || "Payment authorization failed. Any held inventory has been restored.";
                MessageBox.error(sErrMsg, {
                    title: "Checkout / Payment Error",
                    details: "The transaction could not be processed. If you simulated failure, this is expected behavior."
                });
            });
        }
    });
});
