sap.ui.define(
  [
    "com/market/m/productmanager/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/market/m/productmanager/model/formatter",
    "sap/ui/Device",
    "sap/ui/core/Fragment",
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
    Fragment,
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

        onProductClick: function (oEvent) {
          const oContext = oEvent.getSource().getBindingContext();
          const sProductId = oContext.getProperty("ProductID");
          this.getRouter().navTo("RouteProduct", {
            productId: sProductId,
          });
        },

        onPressRefresh: function () {
          const oTable = this.byId("productsTable");
          oTable.setBusy(true);
          this.rebindTable(this.getCurrentFilters());
        },

        onPressDeleteProduct: function (oEvent) {
          const oButton = oEvent.getSource();
          const oContext = oButton.getBindingContext();
          if (oContext) {
            Fragment.load({
              id: "deleteProductDialog",
              name: "com.market.m.productmanager.view.fragment.ConfirmDeleteProduct",
              controller: this,
            }).then((oDialog) => {
              this.getView().addDependent(oDialog);
              oDialog.setBindingContext(oContext);
              oDialog.open();
            });
          }
        },

        onConfirmDeleteProduct: function (oEvent) {
          const oDialog = oEvent.getSource();
          const oContext = oDialog.getBindingContext();
          if (oContext) {
            const sPath = oContext.getPath();
            this.getModel().remove(sPath, {
              success: () => {
                MessageToast.show("Product deleted successfully");
                this.rebindTable(this.getCurrentFilters());
              },
              error: (oError) => {
                MessageBox.error("Error deleting product: " + oError.message);
              },
            });
          }
          oDialog.close();
        },

        onCancelDeleteProduct: function (oEvent) {
          oEvent.getSource().close();
        },

        onCreateProduct: function () {
          if (!this._oCreateDialog) {
            this._oCreateDialog = sap.ui.xmlfragment(
              "com.market.m.productmanager.view.fragment.CreateProduct",
              this
            );
            this.getView().addDependent(this._oCreateDialog);
          }
          var oModel = new sap.ui.model.json.JSONModel({
            isEditModel: false,
            ProductID: "",
            Name: "",
            Price: "",
            CurrencyCode: "USD",
          });
          this._oCreateDialog.setModel(oModel);
          this._oCreateDialog.open();
        },
        onSaveProduct: function () {
          var oDialogModel = this._oCreateDialog.getModel();
          var oData = oDialogModel.getData();
          if (!oData.isEditMode) {
            this.getView()
              .getModel()
              .create("/ProductSet", oData, {
                success: function () {
                  MessageToast.show("Product created successfully");
                  this._oCreateDialog.close();
                  this.byId("productsTable").getBinding("items").refresh();
                }.bind(this),
                error: function () {
                  MessageToast.show("Error creating product");
                },
              });
          }
        },

        onCloseDialog: function () {
          this._oCreateDialog.close();
        },

        onProductPress: function (oEvent) {
          var oItem = oEvent.getSource();
          var sProductId = oItem.getBindingContext().getProperty("ProductID");
          this.getOwnerComponent()
            .getRouter()
            .navTo("RouteProduct", { productId: sProductId });
        },
      }
    );
  }
);
