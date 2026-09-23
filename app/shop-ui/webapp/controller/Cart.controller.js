sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Cart", {
        onInit: function () {
            this.getRouter().getRoute("cart").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function () {
            this._refreshCart();
        },

        _refreshCart: function () {
            var oCartList = this.byId("cartItemsList");
            if (oCartList) {
                var oBinding = oCartList.getBinding("items");
                if (oBinding) {
                    oBinding.refresh();
                }
            }
            this.refreshCartCount();

            // Refresh ActiveCart binding on view if present
            var oCartModel = this.getModel("cart");
            if (oCartModel) {
                var oList = oCartModel.bindList("/ActiveCart");
                var that = this;
                oList.requestContexts(0, 1).then(function (aContexts) {
                    if (aContexts && aContexts[0]) {
                        that.getView().bindElement({
                            model: "cart",
                            path: aContexts[0].getPath()
                        });
                    }
                });
            }
        },

        onQuantityChange: function (oEvent) {
            var iNewQty = oEvent.getParameter("value");
            var oContext = oEvent.getSource().getBindingContext("cart");
            if (!oContext) return;

            var sItemId = oContext.getProperty("ID");
            var oCartModel = this.getModel("cart");
            var that = this;
            this.setBusy(true);

            var oOperation = oCartModel.bindContext("/updateCartQuantity(...)");
            oOperation.setParameter("cartItem_ID", sItemId);
            oOperation.setParameter("quantity", iNewQty);

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Quantity updated");
                that._refreshCart();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to update quantity");
            });
        },

        onDeleteItem: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("cart");
            if (!oContext) return;

            var sItemId = oContext.getProperty("ID");
            var oCartModel = this.getModel("cart");
            var that = this;
            this.setBusy(true);

            var oOperation = oCartModel.bindContext("/removeFromCart(...)");
            oOperation.setParameter("cartItem_ID", sItemId);

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Item removed from Cart");
                that._refreshCart();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to remove item");
            });
        },

        onSaveForLater: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("cart");
            if (!oContext) return;
            var sItemId = oContext.getProperty("ID");
            var oCartModel = this.getModel("cart");
            var that = this;
            this.setBusy(true);

            var oOperation = oCartModel.bindContext("/saveForLater(...)");
            oOperation.setParameter("cartItem_ID", sItemId);
            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Item saved for later");
                that._refreshCart();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to save item for later");
            });
        },

        onMoveToCart: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("cart");
            if (!oContext) return;
            var sItemId = oContext.getProperty("ID");
            var oCartModel = this.getModel("cart");
            var that = this;
            this.setBusy(true);

            var oOperation = oCartModel.bindContext("/moveToCart(...)");
            oOperation.setParameter("cartItem_ID", sItemId);
            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Moved to active Cart");
                that._refreshCart();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to move item to cart");
            });
        },

        onApplyCoupon: function () {
            var oInput = this.byId("couponCodeInput");
            var sCoupon = oInput ? oInput.getValue().trim() : "";
            if (!sCoupon) {
                MessageToast.show("Please enter a coupon code");
                return;
            }

            var oCartModel = this.getModel("cart");
            var that = this;
            this.setBusy(true);

            var oOperation = oCartModel.bindContext("/applyCoupon(...)");
            oOperation.setParameter("couponCode", sCoupon);

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Coupon '" + sCoupon + "' applied successfully!");
                that._refreshCart();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Invalid or expired coupon code");
            });
        },

        onProceedToCheckout: function () {
            this.navTo("checkout");
        },

        onClearCart: function () {
            var that = this;
            MessageBox.confirm("Are you sure you want to remove all items from your shopping cart?", {
                title: "Clear Cart",
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var oCartModel = that.getModel("cart");
                        that.setBusy(true);
                        var oOperation = oCartModel.bindContext("/clearCart(...)");
                        oOperation.execute().then(function () {
                            that.setBusy(false);
                            MessageToast.show("Cart cleared");
                            that._refreshCart();
                        }).catch(function (oErr) {
                            that.setBusy(false);
                            MessageBox.error(oErr.message || "Failed to clear cart");
                        });
                    }
                }
            });
        },

        onScrollToTop: function () {
            var oPage = this.byId("cartPage");
            if (oPage && oPage.scrollTo) {
                oPage.scrollTo(0, 300);
            }
        }
    });
});
