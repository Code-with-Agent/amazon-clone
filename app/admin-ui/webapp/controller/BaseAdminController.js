sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/core/routing/History",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, UIComponent, History, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("marketplace.admin.controller.BaseAdminController", {
        getRouter: function () {
            return UIComponent.getRouterFor(this);
        },

        getModel: function (sName) {
            return this.getView().getModel(sName);
        },

        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        navTo: function (sRoute, oParams) {
            this.getRouter().navTo(sRoute, oParams);
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("overview", {}, true);
            }
        },

        setBusy: function (bBusy) {
            this.getView().setBusy(bBusy);
        },

        formatCurrency: function (vValue, sCurrency) {
            if (vValue === null || vValue === undefined || isNaN(vValue)) return "$0.00";
            var f = parseFloat(vValue);
            return (sCurrency || "$") + f.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        formatDate: function (vDate) {
            if (!vDate) return "";
            try {
                var d = new Date(vDate);
                return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
            } catch {
                return String(vDate);
            }
        },

        formatDateTime: function (vDate) {
            if (!vDate) return "";
            try {
                var d = new Date(vDate);
                return d.toLocaleString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit"
                });
            } catch {
                return String(vDate);
            }
        },

        formatCriticalityState: function (iCriticality) {
            switch (iCriticality) {
                case 3: return "Success";
                case 2: return "Warning";
                case 1: return "Error";
                default: return "None";
            }
        },

        showSuccess: function (sMsg) {
            MessageToast.show(sMsg);
        },

        showError: function (sMsg) {
            MessageBox.error(sMsg);
        }
    });
});
