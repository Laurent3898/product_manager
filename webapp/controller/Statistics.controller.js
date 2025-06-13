sap.ui.define(
  [
    "com/market/m/productmanager/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
  ],
  function (BaseController, JSONModel, MessageBox, FlattenedDataset, FeedItem) {
    "use strict";

    return BaseController.extend(
      "com.market.m.productmanager.controller.Statistics",
      {
        onInit: function () {
          this.getRouter()
            .getRoute("RouteStatistics")
            .attachPatternMatched(this._onRouteMatched, this);
        },

        _onRouteMatched: function () {
          this._loadStatistics();
        },

        _loadStatistics: function () {
          const oModel = this.getModel();
          oModel.read("/ProductSet", {
            success: (oData) => {
              const aProducts = oData.results || [];

              // Calcul des statistiques pour les tuiles
              const totalProducts = aProducts.length;
              const uniqueCategories = new Set(
                aProducts.map((p) => p.Category || "Sans catégorie")
              ).size;
              const uniqueSuppliers = new Set(
                aProducts.map((p) => p.SupplierID || "Inconnu")
              ).size;
              const totalPrice = aProducts.reduce(
                (sum, p) => sum + (parseFloat(p.Price) || 0),
                0
              );
              const averagePrice =
                totalProducts > 0
                  ? (totalPrice / totalProducts).toFixed(2)
                  : "0.00";
              const currency =
                aProducts.length > 0
                  ? aProducts[0].CurrencyCode || "EUR"
                  : "EUR";

              // Création du modèle pour les tuiles
              const stats = {
                totalProducts: totalProducts,
                uniqueCategories: uniqueCategories,
                uniqueSuppliers: uniqueSuppliers,
                averagePrice: averagePrice,
                currency: currency,
              };
              const oStatsModel = new JSONModel(stats);
              this.getView().setModel(oStatsModel, "stats");

              // Préparation des données pour le graphique
              const categoryData = this._getCategoryData(aProducts);
              console.log("Category Data:", categoryData); // Débogage
              const chartModel = new JSONModel({ categoryData: categoryData });
              this.getView().setModel(chartModel, "chart");

              // Configuration du graphique
              this._setupChart();
            },
            error: (oError) => {
              MessageBox.error(
                "Échec du chargement des statistiques. Veuillez réessayer."
              );
            },
          });
        },

        _getCategoryData: function (aProducts) {
          const mCategories = {};
          aProducts.forEach((oProduct) => {
            const sCategory = oProduct.Category || "Sans catégorie";
            mCategories[sCategory] = (mCategories[sCategory] || 0) + 1;
          });
          const categoryData = Object.keys(mCategories).map((sCategory) => ({
            Category: sCategory,
            Count: mCategories[sCategory],
          }));
          return categoryData.length > 0
            ? categoryData
            : [{ Category: "Aucune donnée", Count: 0 }]; // Données par défaut
        },

        _setupChart: function () {
          const oVizFrame = this.byId("vizFrame");
          if (!oVizFrame) {
            console.error("VizFrame avec l'ID 'vizFrame' non trouvé.");
            return;
          }

          // Réinitialiser les feeds existants pour éviter les erreurs de liaison
          oVizFrame.destroyFeeds();
          oVizFrame.destroyDataset();

          // Créer le dataset
          const oDataset = new FlattenedDataset({
            dimensions: [
              {
                name: "Category",
                value: "{Category}",
              },
            ],
            measures: [
              {
                name: "Count",
                value: "{Count}",
              },
            ],
            data: {
              path: "/categoryData",
            },
          });

          // Appliquer le dataset et le modèle
          oVizFrame.setDataset(oDataset);
          oVizFrame.setModel(this.getView().getModel("chart"));

          // Configurer les propriétés visuelles
          oVizFrame.setVizProperties({
            title: {
              visible: true,
              text: this.getResourceBundle().getText("chartTitle"),
            },
            plotArea: {
              colorPalette: [
                "#5cbae6",
                "#b6d957",
                "#fac364",
                "#8cd3ff",
                "#d998cb",
              ],
            },
          });

          // Ajouter les feeds
          const feedCategoryAxis = new FeedItem({
            uid: "categoryAxis",
            type: "Dimension",
            values: ["Category"],
          });
          const feedValueAxis = new FeedItem({
            uid: "valueAxis",
            type: "Measure",
            values: ["Count"],
          });
          oVizFrame.addFeed(feedCategoryAxis);
          oVizFrame.addFeed(feedValueAxis);
        },

        onRefreshPress: function () {
          this._loadStatistics();
        },

        onNavBack: function () {
          this.getRouter().navTo("RouteMain");
        },
      }
    );
  }
);
