sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], function (BaseController, Filter, FilterOperator, MessageBox, MessageToast) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Orders", {
        onInit: function () {
            this.getRouter().getRoute("orders").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function () {
            var oList = this.byId("ordersMasterList");
            if (oList && oList.getBinding("items")) {
                oList.getBinding("items").refresh();
            }
        },

        onFilterTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oList = this.byId("ordersMasterList");
            if (!oList) return;

            var oBinding = oList.getBinding("items");
            if (!oBinding) return;

            if (sKey === "ALL") {
                oBinding.filter([]);
            } else {
                oBinding.filter([new Filter("status", FilterOperator.EQ, sKey)]);
            }
        },

        onViewOrderDetails: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("order");
            if (oContext) {
                var sOrderId = oContext.getProperty("ID");
                this.navTo("orderDetail", { orderId: sOrderId });
            }
        },

        onTrackPackage: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("order");
            if (oContext) {
                var sOrderId = oContext.getProperty("ID");
                this.navTo("orderDetail", { orderId: sOrderId });
            }
        },

        onViewInvoice: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("order");
            if (oContext) {
                var sNumber = oContext.getProperty("orderNumber");
                var fTotal = oContext.getProperty("grandTotal");
                MessageBox.information(
                    "Invoice Details:\nOrder Number: " + sNumber + "\nTotal Amount: $" + fTotal + "\nStatus: Tax invoice issued.",
                    { title: "Commercial Tax Invoice" }
                );
            }
        },

        onCancelOrderPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("order");
            if (!oContext) return;

            var sOrderId = oContext.getProperty("ID");
            var that = this;

            MessageBox.confirm("Are you sure you want to cancel this order? Any reserved inventory will be immediately released.", {
                title: "Cancel Order Confirmation",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._executeCancelOrder(sOrderId);
                    }
                }
            });
        },

        _executeCancelOrder: function (sOrderId) {
            var that = this;
            var oOrderModel = this.getModel("order");
            this.setBusy(true);

            var oOperation = oOrderModel.bindContext("/cancelOrder(...)");
            oOperation.setParameter("order_ID", sOrderId);
            oOperation.setParameter("reason", "Cancelled by customer via Aura Portal");

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Order cancelled successfully. Reserved stock has been released.");
                that._onPatternMatched();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to cancel order");
            });
        },

        onReturnOrderPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("order");
            if (!oContext) return;

            var sOrderId = oContext.getProperty("ID");
            var aItems = oContext.getProperty("items") || [];
            var that = this;

            MessageBox.confirm("Submit a return request for this order?", {
                title: "Initiate Return & Refund",
                actions: [MessageBox.Action.YES, MessageBox.Action.NO],
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.YES) {
                        that._executeReturnOrder(sOrderId, aItems);
                    }
                }
            });
        },

        _executeReturnOrder: function (sOrderId, aItems) {
            var that = this;
            var oOrderModel = this.getModel("order");
            this.setBusy(true);

            var aReturnPayload = (aItems || []).map(function (it) {
                return {
                    orderItem_ID: it.ID,
                    quantity: it.quantity,
                    reason: "Customer requested return"
                };
            });

            var oOperation = oOrderModel.bindContext("/returnOrder(...)");
            oOperation.setParameter("order_ID", sOrderId);
            oOperation.setParameter("items", aReturnPayload);
            oOperation.setParameter("reason", "Customer satisfaction guarantee claim");

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Return processed successfully. RMA generated and inventory restocked.");
                that._onPatternMatched();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to process return");
            });
        },

        onBuyAgainPress: function () {
            MessageToast.show("Added to cart");
            this.refreshCartCount();
        },

        onReturnItemPress: function (oEvent) {
            this.onReturnOrderPress(oEvent);
        },

        onWriteReviewPress: function () {
            this.navTo("reviews", { productId: "p0000000-0000-0000-0000-000000000001" });
        }
    });
});
