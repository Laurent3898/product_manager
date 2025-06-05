sap.ui.define(
  [
    "com/market/m/productmanager/controller/BaseController",
    "com/market/m/productmanager/model/formatter",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (BaseController, formatter, Fragment, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend(
      "com.market.m.productmanager.controller.Product",
      {
        formatter: formatter,

        // Initialize the controller and attach route handler
        onInit: function () {
          this.getRouter()
            .getRoute("RouteProduct")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        // Handle route matching and bind the view
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

        // Check binding context and navigate if not found
        _onBindingChange: function () {
          const oView = this.getView();
          const oElementBinding = oView.getElementBinding();
          if (!oElementBinding.getBoundContext()) {
            this.getRouter().navTo("RouteProductNotFound");
          }
        },

        // Open the edit dialog with current product data
        onEditProduct: function () {
          if (!this._oEditDialog) {
            this._oEditDialog = sap.ui.xmlfragment(
              "com.market.m.productmanager.view.fragment.ProductDialog",
              this
            );
            this.getView().addDependent(this._oEditDialog);
          }
          var oContext = this.getView().getBindingContext();
          var oData = oContext.getObject();
          oData.isEditMode = true;
          var oModel = new sap.ui.model.json.JSONModel(oData);
          this._oEditDialog.setModel(oModel);
          this._oEditDialog.open();
        },

        // Save the edited product
        onSaveProduct: function () {
          var oDialogModel = this._oEditDialog.getModel();
          var oData = oDialogModel.getData();
          if (oData.isEditMode) {
            var sPath = this.getView().getBindingContext().getPath();
            this.getModel().update(sPath, oData, {
              success: function () {
                MessageToast.show("Product updated successfully");
                this._oEditDialog.close();
              }.bind(this),
              error: function () {
                MessageToast.show("Error updating product");
              },
            });
          }
        },

        // Close the edit dialog
        onCloseDialog: function () {
          this._oEditDialog.close();
        },

        // Delete the product after confirmation
        onDeleteProduct: function () {
          var oContext = this.getView().getBindingContext();
          var sPath = oContext.getPath();
          MessageBox.confirm("Are you sure you want to delete this product?", {
            onClose: function (sAction) {
              if (sAction === "OK") {
                this.getModel().remove(sPath, {
                  success: function () {
                    MessageToast.show("Product deleted successfully");
                    this.getRouter().navTo("RouteMain");
                  }.bind(this),
                  error: function () {
                    MessageToast.show("Error deleting product");
                  },
                });
              }
            }.bind(this),
          });
        },
      }
    );
  }
);
