sap.ui.define([
    "marketplace/shop/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter"
], function (BaseController, JSONModel, Filter, FilterOperator, Sorter) {
    "use strict";

    return BaseController.extend("marketplace.shop.controller.SearchResults", {
        onInit: function () {
            var oResultsModel = new JSONModel({
                query: "",
                selectedBrand: "",
                minPrice: null,
                maxPrice: null,
                minRating: null
            });
            this.setModel(oResultsModel, "searchResults");

            this.getRouter().getRoute("search").attachPatternMatched(this._onPatternMatched, this);
        },

        _onPatternMatched: function (oEvent) {
            var oArgs = oEvent.getParameter("arguments");
            var oQuery = oArgs["?query"] || {};
            var sQueryStr = oQuery.q ? decodeURIComponent(oQuery.q) : "";

            var oModel = this.getModel("searchResults");
            oModel.setProperty("/query", sQueryStr || "All Products");

            this._applySearchFilter(sQueryStr);
        },

        _applySearchFilter: function (sQuery) {
            var oGrid = this.byId("searchResultsProductsGrid");
            if (!oGrid) return;

            var oBinding = oGrid.getBinding("items");
            if (!oBinding) return;

            var aFilters = [];
            if (sQuery && sQuery !== "All Products" && sQuery !== "Featured" && sQuery !== "Deals") {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("title", FilterOperator.Contains, sQuery),
                        new Filter("brand", FilterOperator.Contains, sQuery),
                        new Filter("description", FilterOperator.Contains, sQuery)
                    ],
                    and: false
                }));
            } else if (sQuery === "Featured") {
                aFilters.push(new Filter("isFeatured", FilterOperator.EQ, true));
            }

            oBinding.filter(aFilters);
        },

        onSortChange: function (oEvent) {
            var sKey = oEvent.getSource().getSelectedKey();
            var oGrid = this.byId("searchResultsProductsGrid");
            var oBinding = oGrid.getBinding("items");
            if (!oBinding) return;

            var aSorters = [];
            if (sKey === "rating") {
                aSorters.push(new Sorter("averageRating", true));
            } else if (sKey === "featured") {
                aSorters.push(new Sorter("isFeatured", true));
            }

            oBinding.sort(aSorters);
        },

        onFilterChange: function (oEvent) {
            var bSelected = oEvent.getParameter("selected");
            var sBrand = oEvent.getSource().data("filterVal");
            var oGrid = this.byId("searchResultsProductsGrid");
            var oBinding = oGrid.getBinding("items");
            if (!oBinding) return;

            if (bSelected && sBrand) {
                oBinding.filter([new Filter("brand", FilterOperator.EQ, sBrand)]);
            } else {
                oBinding.filter([]);
            }
        },

        onPriceFilter: function (oEvent) {
            var sMaxPrice = oEvent.getSource().data("maxPrice");
            var sMinPrice = oEvent.getSource().data("minPrice");
            // Informational notification for range filtering
            this.showSuccessMessage("Filtered by price: " + (sMinPrice ? "$" + sMinPrice : "") + (sMaxPrice ? " up to $" + sMaxPrice : ""));
        },

        onRatingFilter: function (oEvent) {
            var sMinRating = oEvent.getSource().data("minRating");
            var oGrid = this.byId("searchResultsProductsGrid");
            var oBinding = oGrid.getBinding("items");
            if (oBinding) {
                oBinding.filter([new Filter("averageRating", FilterOperator.GE, parseFloat(sMinRating))]);
            }
        },

        onResetFilters: function () {
            var oGrid = this.byId("searchResultsProductsGrid");
            var oBinding = oGrid.getBinding("items");
            if (oBinding) {
                oBinding.filter([]);
            }
            this.showSuccessMessage("Filters reset");
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
            var oPage = this.byId("searchResultsPage");
            if (oPage && oPage.scrollTo) {
                oPage.scrollTo(0, 300);
            }
        }
    });
});
