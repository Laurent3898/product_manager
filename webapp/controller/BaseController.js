sap.ui.define(["sap/ui/core/mvc/Controller"], function (Controller) {
  "use strict";

  return Controller.extend(
    "com.market.m.productmanager.controller.BaseController",
    {
      /**
       * Get a model from the view
       * @param {string} sName - The model name (optional)
       * @returns {sap.ui.model.Model} The model instance
       */
      getModel: function (sName) {
        return this.getView().getModel(sName);
      },

      /**
       * Set a model to the view
       * @param {sap.ui.model.Model} oModel - The model instance
       * @param {string} sName - The model name (optional)
       * @returns {sap.ui.core.mvc.View} The view instance
       */
      setModel: function (oModel, sName) {
        return this.getView().setModel(oModel, sName);
      },

      /**
       * Get the resource bundle for i18n
       * @returns {sap.base.i18n.ResourceBundle} The resource bundle
       */
      getResourceBundle: function () {
        return this.getOwnerComponent().getModel("i18n").getResourceBundle();
      },

      /**
       * Get the router instance
       * @returns {sap.m.routing.Router} The router
       */
      getRouter: function () {
        return this.getOwnerComponent().getRouter();
      },

      /**
       * Get or create the product dialog
       * @returns {sap.ui.core.Control} The product dialog instance
       */
      getProductDialog: function () {
        if (!this._oProductDialog) {
          this._oProductDialog = sap.ui.xmlfragment(
            "com.market.m.productmanager.view.fragment.ProductDialog",
            this
          );
          this.getView().addDependent(this._oProductDialog);
        }
        return this._oProductDialog;
      },
    }
  );
});
