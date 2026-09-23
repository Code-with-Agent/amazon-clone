sap.ui.define([], function () {
    "use strict";

    return {
        formatCurrency: function (sAmount, sCurrency) {
            if (sAmount === null || sAmount === undefined || sAmount === "") {
                return "$0.00";
            }
            var fAmount = parseFloat(sAmount);
            var sSymbol = sCurrency === "EUR" ? "€" : "$";
            return sSymbol + fAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        formatDate: function (sDate) {
            if (!sDate) return "";
            var oDate = new Date(sDate);
            return oDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        },

        formatDateTime: function (sDate) {
            if (!sDate) return "";
            var oDate = new Date(sDate);
            return oDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        },

        formatStatusState: function (sStatus) {
            switch (sStatus) {
                case "CONFIRMED":
                case "PAID":
                case "DELIVERED":
                case "ACTIVE":
                case "APPROVED":
                case "CAPTURED":
                case "FULFILLED":
                    return "Success";
                case "PENDING_PAYMENT":
                case "PREPARING":
                case "PROCESSING":
                case "PARTIAL":
                    return "Warning";
                case "CANCELLED":
                case "PAYMENT_FAILED":
                case "FAILED":
                case "REJECTED":
                    return "Error";
                case "SHIPPED":
                case "DISPATCHED":
                case "IN_TRANSIT":
                case "RETURNED":
                case "REFUNDED":
                    return "Information";
                default:
                    return "None";
            }
        },

        formatStockText: function (iAvailable) {
            var iStock = parseInt(iAvailable, 10);
            if (isNaN(iStock) || iStock <= 0) {
                return "Out of Stock";
            }
            if (iStock < 5) {
                return "Only " + iStock + " left in stock - order soon";
            }
            return "In Stock";
        },

        formatStockState: function (iAvailable) {
            var iStock = parseInt(iAvailable, 10);
            if (isNaN(iStock) || iStock <= 0) {
                return "Error";
            }
            if (iStock < 5) {
                return "Warning";
            }
            return "Success";
        },

        formatDiscountBadge: function (sOriginalPrice, sCurrentPrice) {
            var fOrig = parseFloat(sOriginalPrice);
            var fCurr = parseFloat(sCurrentPrice);
            if (fOrig && fCurr && fOrig > fCurr) {
                var iPercent = Math.round(((fOrig - fCurr) / fOrig) * 100);
                return "Save " + iPercent + "%";
            }
            return "";
        },

        hasDiscount: function (sOriginalPrice, sCurrentPrice) {
            var fOrig = parseFloat(sOriginalPrice);
            var fCurr = parseFloat(sCurrentPrice);
            return Boolean(fOrig && fCurr && fOrig > fCurr);
        },

        formatRatingStars: function (fRating) {
            var r = parseFloat(fRating) || 0;
            return r.toFixed(1) + " ★";
        }
    };
});
