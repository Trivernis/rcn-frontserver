/**
 * A Series of utility functions
 */

/**
 * returns the extension of a file for the given filename.
 * @param  {String} filename The name of the file.
 * @return {String}          A string that represents the file-extension.
 */
exports.getExtension = function(filename) {
  if (!filename) return null;
  try {
    let exts = filename.match(/\.[a-z]+/g); // get the extension by using regex
    if (exts) return exts[exts.length - 1]; // return the found extension
    else return null; // return null if no extension could be found
  } catch (error) {
    logger.warn(error);
    return null;
  }
}
