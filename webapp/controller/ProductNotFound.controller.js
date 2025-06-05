sap.ui.define(
  ["com/market/m/productmanager/controller/BaseController"],
  function (BaseController) {
    "use strict";

    return BaseController.extend(
      "com.market.m.productmanager.controller.ProductNotFound",
      {
        onBackToHome: function () {
          this.getRouter().navTo("RouteMain");
        },
      }
    );
  }
);
