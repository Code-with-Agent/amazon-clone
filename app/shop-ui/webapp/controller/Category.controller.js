sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.Category", {
        onInit: function () {
            var oCategoryModel = new JSONModel({
                id: "",
                name: "Electronics & Tech",
                description: "Browse high performance laptops, audio gear, and smartphones."
            });
            this.setModel(oCategoryModel, "categoryModel");

            this.getRouter().getRoute("category").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var sCategoryId = oEvent.getParameter("arguments").categoryId;
            var oModel = this.getModel("categoryModel");
            oModel.setProperty("/id", sCategoryId);

            // Fetch category details
            var oCategoryMap = {
                "cat00000-0000-0000-0000-000000000001": {
                    name: "Consumer Electronics",
                    description: "Discover state-of-the-art computers, audio equipment, and flagship phones."
                },
                "cat00000-0000-0000-0000-000000000002": {
                    name: "Computers & Laptops",
                    description: "High performance laptops, workstations, and computing gear."
                },
                "cat00000-0000-0000-0000-000000000003": {
                    name: "Audio & Headphones",
                    description: "Industry-leading noise cancelling headphones, earbuds, and audio monitors."
                },
                "cat00000-0000-0000-0000-000000000004": {
                    name: "Smartphones & Mobile",
                    description: "Premium titanium smartphones, mobile cameras, and accessories."
                }
            };

            if (oCategoryMap[sCategoryId]) {
                oModel.setProperty("/name", oCategoryMap[sCategoryId].name);
                oModel.setProperty("/description", oCategoryMap[sCategoryId].description);
            }

            // Filter products
            var oGrid = this.byId("categoryProductsGrid");
            if (oGrid) {
                var oBinding = oGrid.getBinding("items");
                if (oBinding) {
                    if (sCategoryId && sCategoryId !== "cat00000-0000-0000-0000-000000000001") {
                        oBinding.filter([new Filter("category_ID", FilterOperator.EQ, sCategoryId)]);
                    } else {
                        oBinding.filter([]);
                    }
                }
            }
        },

        onSubcategoryPress: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (oContext) {
                var sId = oContext.getProperty("ID");
                this.navTo("category", { categoryId: sId });
            }
        },

        onQuickAddToCart: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            if (!oContext) return;

            var sProductId = oContext.getProperty("ID");
            var aVariants = oContext.getProperty("variants");
            var sVariantId = aVariants && aVariants[0] ? aVariants[0].ID : null;
            var sOfferId = aVariants && aVariants[0] && aVariants[0].offers && aVariants[0].offers[0]
                ? aVariants[0].offers[0].ID : null;

            this.onAddToCartAction(sProductId, sVariantId, sOfferId, 1);
        },

        onScrollToTop: function () {
            var oPage = this.byId("categoryPage");
            if (oPage && oPage.scrollTo) {
                oPage.scrollTo(0, 300);
            }
        }
    });
});
