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
var logger = require("winston");

/**
 * Sets the logger for logging
 * @param  {Winston Logger} newLogger
 */
exports.setLogger = function(newLogger) {
  logger = newLogger;
  caching.setLogger(logger);
}

/**
 * Returns the data for the file. In some cases the data is processed or loaded from cache.
 * @param  {String} filename The file containing the data
 * @return {String}          The data that should be send
 */
exports.getProcessed = function(filename) {
  try {
    logger.debug("Processing File %s", filename);
    var extension = utils.getExtension(filename);
    var data = null;
    if (caching.isCached(filename)) return caching.getCached(filename)
    logger.debug("File is not cached. Processing...");
    switch (pp_config[extension]) {
      case "sass":
        logger.debug("Processing sass %s", filename);
        data = Buffer.from(pp_sass.renderSync({
          file: filename
        }).css).toString("utf-8");
        break;
      case "html":
        logger.debug("Processing html %s", filename);
        data = pp_html.formatHtml(filename);
        break;
      default:
        logger.debug("No processor found for %s. Returning data.", filename);
        return fs.readFileSync(filename);
    }
    caching.cache(filename, data);
    logger.debug("Cached file %s", filename);
    return data;
  } catch (error) {
    logger.error(error);
    return "Processing Error";
  }
}
