sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/VBox",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/TextArea",
    "sap/m/RatingIndicator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (BaseController, JSONModel, Dialog, Button, VBox, Label, Input, TextArea, RatingIndicator, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.ProductDetails", {
        onInit: function () {
            this.getRouter().getRoute("product").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sProductId = oEvent.getParameter("arguments").productId;
            this._sProductId = sProductId;

            if (!sProductId) {
                this.navTo("home");
                return;
            }

            var sPath = "/Products(" + sProductId + ")";
            var that = this;

            this.getView().bindElement({
                path: sPath,
                parameters: {
                    $expand: "variants($expand=offers($expand=seller)),images,reviews,category"
                },
                events: {
                    change: this._onBindingChange.bind(this),
                    dataRequested: function () {
                        that.setBusy(true);
                    },
                    dataReceived: function () {
                        that.setBusy(false);
                    }
                }
            });
        },

        _onBindingChange: function () {
            var oContext = this.getView().getBindingContext();
            if (!oContext) {
                this.navTo("home");
                return;
            }

            // Update bundle total price calculation
            var aVariants = oContext.getProperty("variants");
            var fPrice = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? Number(aVariants[0].offers[0].price) : 0.00;

            var fBundleTotal = fPrice + 34.99 + 49.00;
            var oBundleText = this.byId("bundleTotalPriceText");
            if (oBundleText) {
                oBundleText.setText("$" + fBundleTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            }

            // Track in Recently Viewed
            var oUIModel = this.getModel("ui");
            var aRecent = oUIModel.getProperty("/recentlyViewed") || [];
            var sId = oContext.getProperty("ID");
            var sTitle = oContext.getProperty("title");
            var aImages = oContext.getProperty("images");
            var sImg = aImages && aImages[0] ? aImages[0].mediaUrl : "";

            if (!aRecent.some(function (item) { return item.id === sId; })) {
                aRecent.unshift({
                    id: sId,
                    title: sTitle,
                    mediaUrl: sImg,
                    price: fPrice
                });
                if (aRecent.length > 5) aRecent.pop();
                oUIModel.setProperty("/recentlyViewed", aRecent);
            }
        },

        onThumbnailPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (oContext) {
                var sUrl = oContext.getProperty("mediaUrl");
                var oMainImg = this.byId("pdpMainImage");
                if (oMainImg && sUrl) {
                    oMainImg.setSrc(sUrl);
                }
            }
        },

        onBrandPress: function () {
            var oContext = this.getView().getBindingContext();
            if (oContext) {
                var sBrand = oContext.getProperty("brand");
                this.navTo("search", {
                    "?query": { q: encodeURIComponent(sBrand || "") }
                });
            }
        },

        onNavCategory: function () {
            var oContext = this.getView().getBindingContext();
            if (oContext) {
                var sCategoryId = oContext.getProperty("category_ID");
                this.navTo("category", { categoryId: sCategoryId });
            }
        },

        onAddToCart: function () {
            var oContext = this.getView().getBindingContext();
            if (!oContext) return;

            var aVariants = oContext.getProperty("variants");
            var fPrice = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? aVariants[0].offers[0].price : 0;

            if (!fPrice || Number(fPrice) <= 0) {
                MessageBox.warning("This item is currently unavailable and cannot be added to Cart.");
                return;
            }

            var sProductId = oContext.getProperty("ID");
            var sVariantId = aVariants && aVariants[0] ? aVariants[0].ID : null;
            var sOfferId = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? aVariants[0].offers[0].ID : null;

            var oQtyInput = this.byId("pdpQtyInput");
            var iQty = oQtyInput ? oQtyInput.getValue() : 1;

            this.onAddToCartAction(sProductId, sVariantId, sOfferId, iQty);
        },

        onBuyNow: function () {
            var that = this;
            var oContext = this.getView().getBindingContext();
            if (!oContext) return;

            var aVariants = oContext.getProperty("variants");
            var fPrice = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? aVariants[0].offers[0].price : 0;

            if (!fPrice || Number(fPrice) <= 0) {
                MessageBox.warning("This item is currently unavailable.");
                return;
            }

            var sProductId = oContext.getProperty("ID");
            var sVariantId = aVariants && aVariants[0] ? aVariants[0].ID : null;
            var sOfferId = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? aVariants[0].offers[0].ID : null;

            var oQtyInput = this.byId("pdpQtyInput");
            var iQty = oQtyInput ? oQtyInput.getValue() : 1;

            var oCartModel = this.getModel("cart");
            this.setBusy(true);

            var oOperation = oCartModel.bindContext("/addToCart(...)");
            oOperation.setParameter("product_ID", sProductId);
            if (sVariantId) oOperation.setParameter("variant_ID", sVariantId);
            if (sOfferId) oOperation.setParameter("offer_ID", sOfferId);
            oOperation.setParameter("quantity", iQty);

            oOperation.execute().then(function () {
                that.setBusy(false);
                that.refreshCartCount();
                that.navTo("checkout");
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to proceed to checkout");
            });
        },

        onAddToWishlist: function () {
            var oContext = this.getView().getBindingContext();
            if (!oContext) return;

            var sProductId = oContext.getProperty("ID");
            var aVariants = oContext.getProperty("variants");
            var sVariantId = aVariants && aVariants[0] ? aVariants[0].ID : null;

            this.onAddToWishlistAction(sProductId, sVariantId);
        },

        onAddBundleToCart: function () {
            var oContext = this.getView().getBindingContext();
            if (!oContext) return;

            var sProductId = oContext.getProperty("ID");
            var aVariants = oContext.getProperty("variants");
            var sVariantId = aVariants && aVariants[0] ? aVariants[0].ID : null;
            var sOfferId = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? aVariants[0].offers[0].ID : null;

            this.onAddToCartAction(sProductId, sVariantId, sOfferId, 1);
            MessageToast.show("Bundle items added to your Cart with promotional pricing!");
        },

        onNotifyWhenAvailable: function () {
            var sEmail = this.getModel("ui").getProperty("/userEmail");
            MessageBox.success(
                "We will notify you at " + sEmail + " as soon as this item becomes available in stock.",
                { title: "Notification Request Confirmed" }
            );
        },

        onVisitSellerStore: function () {
            var oContext = this.getView().getBindingContext();
            if (oContext) {
                var sBrand = oContext.getProperty("brand");
                this.navTo("search", {
                    "?query": { q: encodeURIComponent(sBrand || "") }
                });
            }
        },

        onContactSeller: function () {
            MessageBox.information(
                "Our authorized merchant partner is available 24/7. An email inquiry window will open with your order reference.",
                { title: "Contact Merchant" }
            );
        },

        onAskQuestion: function () {
            var that = this;
            if (!this._oAskQDialog) {
                var oQInput = new TextArea({ placeholder: "Type your product question here...", rows: 3, width: "100%" });
                this._oAskQDialog = new Dialog({
                    title: "Ask the Community",
                    contentWidth: "400px",
                    content: [
                        new VBox({
                            renderType: "Bare",
                            items: [
                                new Label({ text: "Your Question", required: true }),
                                oQInput
                            ]
                        }).addStyleClass("sapUiSmallMargin")
                    ],
                    beginButton: new Button({
                        text: "Post Question",
                        type: "Emphasized",
                        press: function () {
                            if (!oQInput.getValue().trim()) {
                                MessageToast.show("Please enter your question");
                                return;
                            }
                            MessageToast.show("Question submitted! You will receive email notifications when answered.");
                            oQInput.setValue("");
                            that._oAskQDialog.close();
                        }
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () {
                            that._oAskQDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this._oAskQDialog);
            }
            this._oAskQDialog.open();
        },

        onSearchQA: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            if (sQuery) {
                MessageToast.show("Searching community questions for: " + sQuery);
            }
        },

        onOpenWriteReviewDialog: function () {
            var that = this;
            if (!this._oReviewDialog) {
                var oRating = new RatingIndicator({ value: 5, maxValue: 5 });
                var oHeadline = new Input({ placeholder: "What's most important to know?" });
                var oComment = new TextArea({ placeholder: "What did you like or dislike? How did you use this product?", rows: 4, width: "100%" });

                this._oReviewDialog = new Dialog({
                    title: "Write a Customer Review",
                    contentWidth: "420px",
                    content: [
                        new VBox({
                            renderType: "Bare",
                            items: [
                                new Label({ text: "Overall Rating", required: true }),
                                oRating,
                                new Label({ text: "Review Headline", required: true, class: "sapUiSmallMarginTop" }),
                                oHeadline,
                                new Label({ text: "Written Review", required: true, class: "sapUiSmallMarginTop" }),
                                oComment
                            ]
                        }).addStyleClass("sapUiSmallMargin")
                    ],
                    beginButton: new Button({
                        text: "Submit Review",
                        type: "Emphasized",
                        press: function () {
                            var iRating = oRating.getValue();
                            var sHeadline = oHeadline.getValue();
                            var sComment = oComment.getValue();

                            if (!sHeadline || !sComment) {
                                MessageToast.show("Please enter headline and review text");
                                return;
                            }

                            that._submitReview(iRating, sHeadline, sComment);
                            that._oReviewDialog.close();
                            oHeadline.setValue("");
                            oComment.setValue("");
                        }
                    }),
                    endButton: new Button({
                        text: "Cancel",
                        press: function () {
                            that._oReviewDialog.close();
                        }
                    })
                });
                this.getView().addDependent(this._oReviewDialog);
            }
            this._oReviewDialog.open();
        },

        _submitReview: function (iRating, sHeadline, sComment) {
            var that = this;
            var oCatalogModel = this.getModel();
            this.setBusy(true);

            var oOperation = oCatalogModel.bindContext("/submitReview(...)");
            oOperation.setParameter("product_ID", this._sProductId);
            oOperation.setParameter("rating", iRating);
            oOperation.setParameter("headline", sHeadline);
            oOperation.setParameter("comment", sComment);

            oOperation.execute().then(function () {
                that.setBusy(false);
                MessageToast.show("Review submitted successfully! Thank you for your feedback.");
                that.getView().getElementBinding().refresh();
            }).catch(function (oError) {
                that.setBusy(false);
                MessageBox.error(oError.message || "Failed to submit review");
            });
        },

        onMarkReviewHelpful: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (!oContext) return;

            var sReviewId = oContext.getProperty("ID");
            var oCatalogModel = this.getModel();
            var that = this;

            var oOperation = oCatalogModel.bindContext("/markReviewHelpful(...)");
            oOperation.setParameter("review_ID", sReviewId);
            oOperation.setParameter("isHelpful", true);

            oOperation.execute().then(function () {
                MessageToast.show("Marked as helpful. Thank you!");
                that.getView().getElementBinding().refresh();
            }).catch(function (oError) {
                MessageToast.show(oError.message || "Unable to vote");
            });
        },

        onSeeAllRelated: function () {
            var oContext = this.getView().getBindingContext();
            var sCategoryId = oContext ? oContext.getProperty("category_ID") : "cat00000-0000-0000-0000-000000000001";
            this.navTo("category", { categoryId: sCategoryId });
        }
    });
});
