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
        ITEMS_PER_PAGE: 5,

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

        isSelected: function (sId) {
          const oSelectedProducts =
            this.oViewModel.getProperty("/selectedProducts") || {};
          return !!oSelectedProducts[sId];
        },

        rebindTable: function (aFilters = []) {
          const oTable = this.byId("productsTable");
          const oTemplate = oTable.getBindingInfo("items").template;
          oTable.bindItems({
            path: "/ProductSet",
            template: oTemplate,
            parameters: {
              expand: "ToSupplier",
              top: this.ITEMS_PER_PAGE,
              skip: this.iSkip,
              $inlinecount: "allpages",
            },
            filters: aFilters,
            events: {
              dataRequested: () => oTable.setBusy(true),
              dataReceived: (oData) => {
                oTable.setBusy(false);
                this._updatePagination(oData);
              },
            },
          });
        },

        _updatePagination: function (oEvent) {
          const oData = oEvent.getParameter("data");
          if (!oData) {
            MessageBox.error("Error loading data");
            return;
          }
          const iTotalCount = parseInt(oData.__count, 10) || 0;
          const iTotalPages = Math.ceil(iTotalCount / this.ITEMS_PER_PAGE) || 1;
          const iCurrentPage = Math.floor(this.iSkip / this.ITEMS_PER_PAGE) + 1;
          const iStart = this.iSkip + 1;
          const iEnd = Math.min(this.iSkip + this.ITEMS_PER_PAGE, iTotalCount);

          this.oViewModel.setProperties({
            rangeText: `Displaying ${iStart}-${iEnd} of ${iTotalCount} items`,
            currentPage: iCurrentPage,
            totalPages: iTotalPages,
            prevEnabled: this.iSkip > 0,
            nextEnabled: this.iSkip + this.ITEMS_PER_PAGE < iTotalCount,
          });
        },

        onCheckboxSelect: function (oEvent) {
          const oCheckBox = oEvent.getSource();
          const sProductId = oCheckBox
            .getBindingContext()
            .getProperty("ProductID");
          const bSelected = oEvent.getParameter("selected");
          const oSelectedProducts =
            this.oViewModel.getProperty("/selectedProducts") || {};
          oSelectedProducts[sProductId] = bSelected;
          this.oViewModel.setProperty("/selectedProducts", oSelectedProducts);
        },

        onLiveSearch: function (oEvent) {
          this.iSkip = 0;
          const sQuery = oEvent.getSource().getValue().trim();
          const aFilters = sQuery
            ? [
                new Filter({
                  filters: [
                    new Filter("Name", FilterOperator.Contains, sQuery),
                    new Filter("Description", FilterOperator.Contains, sQuery),
                  ],
                  and: false,
                }),
              ]
            : [];
          this.rebindTable(aFilters);
        },

        onNextPage: function () {
          this.iSkip += this.ITEMS_PER_PAGE;
          this.rebindTable(this.getCurrentFilters());
        },

        onPreviousPage: function () {
          this.iSkip = Math.max(this.iSkip - this.ITEMS_PER_PAGE, 0);
          this.rebindTable(this.getCurrentFilters());
        },

        getCurrentFilters: function () {
          const sQuery = this.byId("searchField").getValue().trim();
          return sQuery
            ? [
                new Filter({
                  filters: [
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

        _openProductDialog: function (bIsEditMode, oContext) {
          const oDialog = this.getProductDialog();
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
              CurrencyCode: "USD",
              Description: "",
              Price: "",
            };
          }
          const oModel = new JSONModel(oData);
          oDialog.setModel(oModel);
          oDialog.open();
        },

        onCreateProduct: function () {
          this._openProductDialog(false);
        },

        onEditProduct: function (oEvent) {
          const oButton = oEvent.getSource();
          const oContext = oButton.getBindingContext();
          if (oContext) {
            this._openProductDialog(true, oContext);
          }
        },

        onSaveProduct: function () {
          const oDialog = this.getProductDialog();
          const oDialogModel = oDialog.getModel();
          const oData = oDialogModel.getData();
          const oModel = this.getModel();

          // Validate all mandatory fields based on the dialog
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
          const isValid = mandatoryFields.every(
            (field) => oData[field] != null && oData[field] !== ""
          );
          if (!isValid) {
            MessageBox.error("Please fill in all mandatory fields.");
            return;
          }

          // Define the fields that belong to the Product entity
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
          ];

          // Create a new object with only the Product entity fields
          const oDataToSend = {};
          productFields.forEach((field) => {
            if (oData.hasOwnProperty(field)) {
              oDataToSend[field] = oData[field];
            }
          });

          const operation = oData.isEditMode ? "update" : "create";
          const promise = oData.isEditMode
            ? this._updateProduct(oModel, oData.sPath, oDataToSend)
            : this._createProduct(oModel, oDataToSend);

          promise
            .then(() => {
              MessageToast.show(`Product ${operation}d successfully`);
              oDialog.close();
              this.byId("productsTable").getBinding("items").refresh();
            })
            .catch((oError) => {
              let sMessage = `Error ${operation}ing product`;
              if (oError.statusCode) {
                sMessage += `: ${oError.statusCode} - ${oError.statusText}`;
              }
              if (oError.responseText) {
                try {
                  const oResponse = JSON.parse(oError.responseText);
                  sMessage += `\nDetails: ${oResponse.error.message.value}`;
                } catch (e) {
                  sMessage += `\nDetails: ${oError.responseText}`;
                }
              }
              MessageBox.error(sMessage);
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
