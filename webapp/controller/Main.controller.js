sap.ui.define(
  [
    "com/market/m/productmanager/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/market/m/productmanager/model/formatter",
    "sap/ui/Device",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
  ],
  function (
    BaseController,
    JSONModel,
    Filter,
    FilterOperator,
    formatter,
    Device,
    MessageToast,
    MessageBox
  ) {
    "use strict";

    return BaseController.extend(
      "com.market.m.productmanager.controller.Main",
      {
        formatter: formatter,

        onInit: function () {
          this.iSkip = 0;
          this.oViewModel = new JSONModel({
            includeSupplier: true,
            searchVisible: true,
            rangeText: "Displaying 0-0 of 0 items",
            currentPage: 1,
            totalPages: 1,
            prevEnabled: false,
            nextEnabled: false,
            selectedProducts: {},
            isPortrait: Device.orientation.portrait,
          });
          this.setModel(this.oViewModel, "viewModel");
          this.rebindTable();

          Device.orientation.attachHandler(this.onOrientationChange.bind(this));
        },

        rebindTable: function (aFilters = []) {
          const oTable = this.byId("productsTable");
          const oTemplate = oTable.getBindingInfo("items").template;
          oTable.bindItems({
            path: "/ProductSet",
            template: oTemplate,
            parameters: {
              expand: "ToSupplier",
            },
            filters: aFilters,
            events: {
              dataRequested: () => oTable.setBusy(true),
              dataReceived: () => {
                oTable.setBusy(false);
                const oBinding = oTable.getBinding("items");
                if (oBinding) {
                  this.oViewModel.setProperties({
                    prevEnabled: this.iSkip > 0,
                  });
                } else {
                  MessageBox.error("Error binding table data");
                }
              },
            },
          });
        },

        onLiveSearch: function (oEvent) {
          this.iSkip = 0;
          const sQuery = oEvent.getSource().getValue().trim();
          const aFilters = sQuery
            ? [
                new Filter({
                  filters: [
                    new Filter("ProductID", FilterOperator.Contains, sQuery),
                  ],
                  and: false, // OR condition
                }),
              ]
            : [];
          this.rebindTable(aFilters);
        },

        getCurrentFilters: function () {
          const sQuery = this.byId("searchField").getValue().trim();
          return sQuery
            ? [
                new Filter({
                  filters: [
                    new Filter("ProductID", FilterOperator.Contains, sQuery),
                    new Filter("Name", FilterOperator.Contains, sQuery),
                    new Filter("Description", FilterOperator.Contains, sQuery),
                  ],
                  and: false,
                }),
              ]
            : [];
        },

        onSupplierToggle: function (oEvent) {
          this.oViewModel.setProperty(
            "/includeSupplier",
            oEvent.getSource().getSelected()
          );
        },

        onOrientationChange: function (oEvent) {
          this.oViewModel.setProperty("/isPortrait", oEvent.portrait);
        },

        onBeforeRendering: function () {
          this.oViewModel.setProperty(
            "/isPortrait",
            Device.orientation.portrait
          );
        },

        onExit: function () {
          Device.orientation.detachHandler(this.onOrientationChange, this);
        },

        onPressRefresh: function () {
          const oTable = this.byId("productsTable");
          oTable.setBusy(true);
          this.rebindTable(this.getCurrentFilters());
        },

        onProductClick: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext();
          const sProductId = oContext.getProperty("ProductID");
          this.getRouter().navTo("RouteProduct", {
            productId: sProductId,
          });
        },

        onPressDeleteProduct: function (oEvent) {
          const oButton = oEvent.getSource();
          const oContext = oButton.getBindingContext();
          if (oContext) {
            if (!this._oDeleteDialog) {
              sap.ui.core.Fragment.load({
                id: "deleteProductDialog",
                name: "com.market.m.productmanager.view.fragment.ConfirmDeleteProduct",
                controller: this,
              }).then((oDialog) => {
                this._oDeleteDialog = oDialog;
                this.getView().addDependent(oDialog);
                oDialog.setBindingContext(oContext);
                oDialog.open();
              });
            } else {
              this._oDeleteDialog.setBindingContext(oContext);
              this._oDeleteDialog.open();
            }
          }
        },

        onConfirmDeleteProduct: function (oEvent) {
          const oDialog = this._oDeleteDialog;
          const oContext = oDialog.getBindingContext();
          if (oContext) {
            const sPath = oContext.getPath();
            this.getModel().remove(sPath, {
              success: () => {
                MessageToast.show("Product deleted successfully");
                this.rebindTable(this.getCurrentFilters());
                oDialog.close();
              },
              error: (oError) => {
                MessageBox.error("Error deleting product: " + oError.message);
              },
            });
          }
        },

        onCancelDeleteProduct: function () {
          this._oDeleteDialog.close();
        },

        generateProductID: function () {
          const oModel = this.getModel();
          return new Promise((resolve, reject) => {
            oModel.read("/ProductSet", {
              success: (oData) => {
                const aProducts = oData.results;
                let iMaxId = 0;
                aProducts.forEach((oProduct) => {
                  const sId = oProduct.ProductID;
                  if (sId.startsWith("RLJ-")) {
                    const iId = parseInt(sId.split("-")[1], 10);
                    if (iId > iMaxId) {
                      iMaxId = iId;
                    }
                  }
                });
                const sNewId = "RLJ-" + ("000" + (iMaxId + 1)).slice(-4);
                resolve(sNewId);
              },
              error: (oError) => {
                reject(oError);
              },
            });
          });
        },

        // Dans Main.controller.js
        _openProductDialog: function (bIsEditMode, oContext) {
          const oDialog = this.getProductDialog(); // Appel de la méthode du BaseController
          let oData;
          if (bIsEditMode) {
            oData = oContext.getObject();
            oData.isEditMode = true;
            oData.sPath = oContext.getPath();
          } else {
            oData = {
              isEditMode: false,
              ProductID: "",
              TypeCode: "",
              Category: "",
              Name: "",
              SupplierID: "",
              TaxTarifCode: 0,
              MeasureUnit: "",
              CurrencyCode: "EUR",
              Description: "",
              Price: "",
              CreatedAt: new Date(),
            };
          }
          const oModel = new sap.ui.model.json.JSONModel(oData);
          oDialog.setModel(oModel);
          oDialog.open();
          return oDialog; // Retourne le dialog
        },

        onCreateProduct: function () {
          this.generateProductID()
            .then((sNewId) => {
              const oDialog = this._openProductDialog(false); // Récupère le dialog retourné
              oDialog.getModel().setProperty("/ProductID", sNewId); // Définit l’ID généré
            })
            .catch((oError) => {
              sap.m.MessageBox.error(
                "Erreur lors de la génération de l’ID : " + oError.message
              );
            });
        },

        onEditProduct: function (oEvent) {
          const oButton = oEvent.getSource();
          const oContext = oButton.getBindingContext();
          if (oContext) {
            this._openProductDialog(true, oContext);
          }
        },

        // Dans Main.controller.js
        onSaveProduct: function () {
          const oDialog = this.getProductDialog();
          const oDialogModel = oDialog.getModel();
          const oData = oDialogModel.getData();
          const oModel = this.getModel();

          const mandatoryFields = [
            "ProductID",
            "Name",
            "Price",
            "CurrencyCode",
            "Category",
            "TypeCode",
            "SupplierID",
            "TaxTarifCode",
            "MeasureUnit",
          ];

          // Convertir TaxTarifCode en nombre
          oData.TaxTarifCode = parseInt(oData.TaxTarifCode, 10);

          // Validation
          const isValid = mandatoryFields.every(
            (field) => oData[field] != null && oData[field] !== ""
          );
          if (
            !isValid ||
            isNaN(oData.TaxTarifCode) ||
            oData.TaxTarifCode <= 0
          ) {
            sap.m.MessageBox.error(
              "Veuillez remplir tous les champs obligatoires et assurez-vous que TaxTarifCode est un entier positif."
            );
            return;
          }

          const productFields = [
            "ProductID",
            "Name",
            "Price",
            "CurrencyCode",
            "Description",
            "Category",
            "TypeCode",
            "SupplierID",
            "TaxTarifCode",
            "MeasureUnit",
            "CreatedAt",
          ];

          const oDataToSend = {};
          productFields.forEach((field) => {
            if (oData.hasOwnProperty(field)) {
              oDataToSend[field] = oData[field];
            }
          });

          const operation = oData.isEditMode ? "mise à jour" : "création";
          const promise = oData.isEditMode
            ? this._updateProduct(oModel, oData.sPath, oDataToSend)
            : this._createProduct(oModel, oDataToSend);

          promise
            .then(() => {
              sap.m.MessageToast.show(`Produit ${operation} avec succès`);
              oDialog.close();
              this.byId("productsTable").getBinding("items").refresh();
            })
            .catch((oError) => {
              let sMessage = `Erreur lors de la ${operation} du produit`;
              if (oError.statusCode) {
                sMessage += `: ${oError.statusCode} - ${oError.statusText}`;
              }
              if (oError.responseText) {
                try {
                  const oResponse = JSON.parse(oError.responseText);
                  sMessage += `\nDétails : ${oResponse.error.message.value}`;
                } catch (e) {
                  sMessage += `\nDétails : ${oError.responseText}`;
                }
              }
              sap.m.MessageBox.error(sMessage);
            });
        },
        _createProduct: function (oModel, oData) {
          return new Promise((resolve, reject) => {
            oModel.create("/ProductSet", oData, {
              success: resolve,
              error: reject,
            });
          });
        },

        _updateProduct: function (oModel, sPath, oData) {
          return new Promise((resolve, reject) => {
            oModel.update(sPath, oData, {
              success: resolve,
              error: reject,
            });
          });
        },

        onCloseDialog: function () {
          this.getProductDialog().close();
        },

        onProductPress: function (oEvent) {
          const oItem = oEvent.getSource();
          const sProductId = oItem.getBindingContext().getProperty("ProductID");
          this.getRouter().navTo("RouteProduct", { productId: sProductId });
        },
      }
    );
  }
);
