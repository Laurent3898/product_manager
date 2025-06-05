sap.ui.define(["sap/ui/core/format/DateFormat"], function (DateFormat) {
  "use strict";

  return {
    formatTitle: function (sId) {
      return sId ? "Product " + sId : "Product N/A";
    },

    formatReleaseDate: function (sDate) {
      if (!sDate) {
        return "";
      }
      const iTicks = parseInt(sDate.substring(6, sDate.length - 2));
      const oDate = new Date(iTicks);
      const oDateFormat = DateFormat.getDateTimeInstance({
        pattern: "yyyy-MM-dd HH:mm",
      });
      return oDateFormat.format(oDate);
    },
  };
});
