sap.ui.define(
  [
    "com/market/m/productmanager/controller/BaseController",
    "com/market/m/productmanager/model/formatter",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (BaseController, formatter, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend(
      "com.market.m.productmanager.controller.Product",
      {
        formatter: formatter,

        onInit: function () {
          this.getRouter()
            .getRoute("RouteProduct")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function (oEvent) {
          const sProductId = oEvent.getParameter("arguments").productId;
          const oView = this.getView();
          const sPath = this.getModel().createKey("ProductSet", {
            ProductID: sProductId,
          });
          oView.bindElement({
            path: "/" + sPath,
            parameters: {
              expand: "ToSupplier",
            },
            events: {
              change: this._onBindingChange.bind(this),
              dataRequested: () => oView.setBusy(true),
              dataReceived: () => oView.setBusy(false),
            },
          });
        },

        _onBindingChange: function () {
          const oView = this.getView();
          const oElementBinding = oView.getElementBinding();
          if (!oElementBinding.getBoundContext()) {
            this.getRouter().navTo("RouteProductNotFound");
          }
        },
      }
    );
  }
);
