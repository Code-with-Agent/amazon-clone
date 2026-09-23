sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (BaseController, MessageBox, MessageToast) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.OrderDetails", {
        onInit: function () {
            this.getRouter().getRoute("orderDetail").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sOrderId = oEvent.getParameter("arguments").orderId;
            this._sOrderId = sOrderId;

            if (sOrderId && sOrderId !== "ord-recent") {
                this.getView().bindElement({
                    model: "order",
                    path: "/Orders(" + sOrderId + ")",
                    parameters: {
                        $expand: "items,shipments,payment"
                    }
                });
            } else {
                // Default to first order in list
                var oOrderModel = this.getModel("order");
                var that = this;
                if (oOrderModel) {
                    var oList = oOrderModel.bindList("/Orders");
                    oList.requestContexts(0, 1).then(function (aContexts) {
                        if (aContexts && aContexts[0]) {
                            that.getView().bindElement({
                                model: "order",
                                path: aContexts[0].getPath(),
                                parameters: {
                                    $expand: "items,shipments,payment"
                                }
                            });
                        }
                    });
                }
            }
        },

        onViewInvoice: function () {
            MessageBox.information("Tax invoice sent to registered email address.", { title: "Invoice" });
        },

        onCancelOrder: function () {
            var that = this;
            MessageBox.confirm("Are you sure you want to cancel this order?", {
                title: "Cancel Order",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oOrderModel = that.getModel("order");
                        var oOperation = oOrderModel.bindContext("/cancelOrder(...)");
                        oOperation.setParameter("order_ID", that._sOrderId);
                        oOperation.setParameter("reason", "Cancelled from Order Details");

                        oOperation.execute().then(function () {
                            MessageToast.show("Order cancelled");
                            that.getView().getElementBinding("order").refresh();
                        }).catch(function (oErr) {
                            MessageBox.error(oErr.message || "Failed to cancel order");
                        });
                    }
                }
            });
        },

        onBuyAgainPress: function () {
            MessageToast.show("Added to cart");
            this.refreshCartCount();
        },

        onReturnItemPress: function () {
            MessageToast.show("Return request submitted");
        },

        onWriteReviewPress: function () {
            this.navTo("reviews", { productId: "p0000000-0000-0000-0000-000000000001" });
        }
    });
});
