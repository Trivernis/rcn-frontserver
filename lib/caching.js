const fs = require("fs"),
  path = require("path"),
  config_path = "./config/caching_dump.json",
  cache_dump = JSON.parse(fs.readFileSync(config_path)),
  cache_dir = "./.cache",
  cache = {}; // TODO: Must read from dump again
if (cache_dump != null && cache_dump["last"] != null) cache = cache_dump["last"];

/**
 * Returns the data from files that were cached
 * @param  {String} filename The name of the file that has been cached
 * @return {String}          The data stored in the file
 */
exports.getCached = function(filename) {
  let cf = cache[filename];
  let call_passed = (Date.now()-cf.last_call) / 1000; // calculate the time since the last call of the file
  if (cf.call_count > 10 && call_passed < 60) {
    cf.data = fs.readFileSync(cf.path); // store the file's data into the json
  } else if (call_passed > 3600) {
    cf.call_count = 0; // reset the counter when an hour has passed since the last call
    cf.data = null; // reset the data to free memory
  }
  cf.last_call = Date.now(); // set the last call to now
  cf.call_count += 1; // increase the call count
  if (cf.data != null)  return cf.data;
  logger.debug("Returning cached data for %s : %s", filename, cf.path);
  return fs.readFileSync(cf.path); // return either the data or read the file
};

/**
 * Safes the file with it's corresponding data in the cache directory
 * @param  {String} filename The name of the file
 * @param  {String} data     The data form the file
 */
exports.cache = function(filename, data) {
  logger.verbose("Creating cache entry for %s", filename);
  if (!fs.existsSync("./.cache")) fs.mkdirSync("./.cache"); // if the cache folder doesn't exist, create it
  let cache_fn = filename.replace(/[^\w\.]/g, "__"); // remove invalid path characters
  let count = 0;
  while (fs.existsSync(filename + count + ".cache")) count++; // check if a file with the same name already exists and increase count
  let cache_path = path.join(cache_dir, cache_fn+count+".cache"); // create the final file path. Cachedir + cached filename (without invalid) + count + .cache
  logger.debug("Creating file %s", cache_path);
  fs.writeFile(cache_path, data, (error) => {
    logger.debug("Created file cache entry for %s", filename);
    cache[filename] = {   // create a cache-entry with the file's path when the file is written (so it won't be accessed before)
      "path": cache_path, // the last call to the file, the count of calls and an
      "last_call": null,  // empty data field to store the file's data if the file
      "call_count": 0,    // was called often
      "data": null,
      "creation_time": Date.now(),
      "changed": false
    };
    fs.watch(filename, (eventType) => { // watch the file for changes
      logger.debug("Change detected on %s", filename);
      if (eventType == 'change') cache[filename].changed = true; // if the event change is detected set the change attribute to  true
    });
  }); // write the data asynchronously to the file
};
var logger = require("winston");

/**
 * Sets the logger for logging
 * @param  {Winston Logger} newLogger
 */
exports.setLogger = function(newLogger) {
  logger = newLogger;
}

/**
 * Returns if the file is already cached
 * @param  {String} filename The filename to check
 * @return {Boolean}          Is it cached or not
 * TODO: Use last access or use creation_time property to check if the file might
 * be too old. If the function returns false, a new cache-file will be created which
 * has a different name from the old. On each startup a function could check if
 * there are cache-files that are not listet in the cache_dump and delete them.
 */
exports.isCached = function(filename) {
  let cached_entry = cache[filename];
  if (cached_entry) { // check if the cache entry exists
    logger.debug("Found cache entry for %s", filename);
    if (cached_entry.changed) return false; // if a change was detected recache the file
    if (cached_entry.path) { // check if the path variable is set
      logger.debug("Found path entry for %s", filename)
      return fs.existsSync(cached_entry.path); // return if the file exists
    }
  }
  logger.debug("Found no cache entry for %s", filename);
  return false; // return false if the cache entry doesn't exist
}

/**
 * A function that dumps the config into the config file after appending the cache to it.
 */
exports.cleanup = function() {
  logger.verbose("Dumping cache into cache_dump file");
  cache_dump["last"] = cache;
  fs.writeFileSync(config_path, JSON.stringify(cache_dump));
}
