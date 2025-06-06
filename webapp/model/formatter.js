sap.ui.define(["sap/ui/core/format/DateFormat"], function (DateFormat) {
  "use strict";
  return {
    formatTitle: function (sId) {
      if (!sId) {
        return "Product N/A"; // Gestion des cas où l'ID est undefined ou null
      }
      return "Product " + sId;
    },
    formatRatingState: function (iRating) {
      if (iRating < 3) {
        return "Warning"; // Yellow
      } else if (iRating === 3) {
        return "Information"; // Blue
      } else {
        return "Success"; // Green
      }
    },

    formatRatingText: function (iRating) {
      let oRessourceMdl = this.getOwnerComponent()
        .getModel("i18n")
        .getResourceBundle();
      switch (iRating) {
        case 1:
          return oRessourceMdl.getText("veryDissatisfied");
        case 2:
          return oRessourceMdl.getText("dissatisfied");
        case 3:
          return oRessourceMdl.getText("neutral");
        case 4:
          return oRessourceMdl.getText("satisfied");
        case 5:
          return oRessourceMdl.getText("verySatisfied");
        default:
          return oRessourceMdl.getText("unknown");
      }
    },

    formatReleaseDate: function (oDate) {
      if (!oDate || isNaN(new Date(oDate))) {
        return "";
      }
      const oDateFormat = DateFormat.getDateTimeInstance({
        pattern: "yyyy-MM-dd HH:mm",
      });
      return oDateFormat.format(new Date(oDate));
    },
  };
});
