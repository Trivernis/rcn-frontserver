const fs = require("fs"),
  utils = require("./utils"),
  caching = require("./caching"),

// pp (preprocessors)
  pp_html = require("./pp_html"),
  pp_sass = require("node-sass"),

  pp_config = {
    ".sass" : "sass",
    ".html": "html",
    ".htm": "hmtl"
  };

/**
 * Returns the data for the file. In some cases the data is processed or loaded from cache.
 * @param  {String} filename The file containing the data
 * @return {String}          The data that should be send
 */
exports.getProcessed = function(filename) {
  try {
    var extension = utils.getExtension(filename);
    var data = null;
    if (caching.isCached(filename)) return caching.getCached(filename)
    switch (pp_config[extension]) {
      case "sass":
        data = Buffer.from(pp_sass.renderSync({
          file: filename
        }).css).toString("utf-8");
        break;
      case "html":
        data = pp_html.formatHtml(filename);
        break;
      default:
        return fs.readFileSync(filename);
    }
    caching.cache(filename, data);
    return data;
  } catch (error) {
    console.error(error);
    return "Processing Error";
  }
}
