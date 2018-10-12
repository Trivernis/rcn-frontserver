const fs = require("fs"),
    utils = require("./utils"),
    caching = require("./caching"),

// pp (preprocessors)
    pp_html = require("./pp_html"),
    pp_sass = require("node-sass"),

    pp_config = {
        ".sass": "sass",
        ".html": "html",
        ".htm": "hmtl"
    };
let logger = require("winston");

/**
 * Sets the logger for logging
 * @param  {Object} newLogger
 */
exports.setLogger = function (newLogger) {
    logger = newLogger;
    caching.setLogger(logger);
};

/**
 * Returns the data for the file. In some cases the data is processed or loaded from cache.
 * @param  {String} filename The file containing the data
 * @return {String}          The data that should be send
 */
exports.getProcessed = function (filename) {
    try {
        logger.debug("Processing File %s", filename);
        let extension = utils.getExtension(filename); // use the utils function to get the files extension
        let data = null;
        if (caching.isCached(filename)) return caching.getCached(filename) // return the cached file if it exists
        logger.debug("File is not cached. Processing...");
        switch (pp_config[extension]) {
            case "sass":
                logger.debug("Processing sass %s", filename);
                data = Buffer.from(pp_sass.renderSync({ // use the sass preprocessor
                    file: filename
                }).css).toString("utf-8");
                break;
            case "html":
                logger.debug("Processing html %s", filename);
                data = pp_html.formatHtml(filename); // use the html-preprocessor
                break;
            default:
                logger.debug("No processor found for %s. Returning data.", filename);
                return fs.readFileSync(filename); // just read the data from the file
        }
        caching.cache(filename, data); // cache the file for faster access next time
        logger.debug("Cached file %s", filename);
        return data; // return the data
    } catch (error) {
        logger.error(error);
        return "Processing Error";
    }
};

/**
 * Cleanup function that calls the cleanup for the caching module
 */
exports.cleanup = function() {
    caching.cleanup();
};