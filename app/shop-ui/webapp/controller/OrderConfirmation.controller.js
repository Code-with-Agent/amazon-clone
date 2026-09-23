sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/ui/model/json/JSONModel"
], function (BaseController, JSONModel) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.OrderConfirmation", {
        onInit: function () {
            var oConfirmModel = new JSONModel({
                orderId: "",
                orderNumber: "ORD-2026-9841",
                orderDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
                totalAmount: "$2,499.00",
                paymentStatus: "PAID",
                shippingRecipient: "Alice Smith",
                shippingAddress: "123 Pike Street, Seattle, WA 98101",
                items: [
                    { title: "Apple MacBook Pro 16-Inch M3 Max", quantity: 1, price: 2499.00 }
                ]
            });
            this.setModel(oConfirmModel, "orderConfirm");

            this.getRouter().getRoute("orderConfirmation").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sOrderId = oEvent.getParameter("arguments").orderId;
            this._sOrderId = sOrderId;

            var oModel = this.getModel("orderConfirm");
            oModel.setProperty("/orderId", sOrderId);

            if (sOrderId && sOrderId.length > 8 && sOrderId !== "ord-recent") {
                var sShort = sOrderId.substring(0, 8).toUpperCase();
                oModel.setProperty("/orderNumber", "ORD-2026-" + sShort);

                // Bind OData Order entity if available
                var oOrderModel = this.getModel("order");
                if (oOrderModel) {
                    var sPath = "/Orders(" + sOrderId + ")";
                    this.getView().bindElement({
                        model: "order",
                        path: sPath,
                        parameters: {
                            $expand: "items,shipments,payment"
                        }
                    });
                }
            } else {
                oModel.setProperty("/orderNumber", "ORD-2026-8492");
            }
        },

        onViewOrder: function () {
            var sOrderId = this._sOrderId || "ord-recent";
            this.navTo("orderDetail", { orderId: sOrderId });
        },

        onContinueShopping: function () {
            this.navTo("home");
        }
    });
});
