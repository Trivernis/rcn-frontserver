// requirement
const https = require('https'),
  fs = require('fs'),
  urlparse = require('url'),
  { JSDOM } = require('jsdom'),
  perfy = require('perfy'),
  winston = require('winston'),
  DailyRotateFile = require('winston-daily-rotate-file'),
  path = require('path'),
// args
  args = require('args-parser')(process.argv), // create an args parser
// ressources
  defaultCss = "/glob/style.css", // the default style that is embedded in every html
  defaultJs = "/glob/script.js", // the default script that is embedded in every html
// config file
  config = JSON.parse(fs.readFileSync("config.json")),
// logging config using winston
  fileLoggingFormat = winston.format.printf(info => {
    return `${info.timestamp} ${info.level.toUpperCase()}: ${JSON.stringify(info.message)}`; // the logging format for files
  }),
  consoleLoggingFormat = winston.format.printf(info => {
    return `${info.timestamp} [${info.level}] ${JSON.stringify(info.message)}`; //the logging format for the console
  }),
  loggingFullFormat = winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp({
      format: 'MM-DD HH:mm:ss.SSS' // don't include the year because the filename already tells
    }),
    fileLoggingFormat // the logging format for files that logs with a capitalized level
  ),
  logger = winston.createLogger({
    level: winston.config.npm.levels, // logs with npm levels
    format: loggingFullFormat, // the full format for files
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(), // colorizes the console logging output
          winston.format.splat(),
          winston.format.timestamp({
            format: 'YY-MM-DD HH:mm:ss.SSS' // logs with the year to the console
          }),
          consoleLoggingFormat // logs with the custom console format
        ),
        level: args.loglevel || 'info' // logs to the console with the arg loglevel or info if it is not given
      }),
      new winston.transports.File({
        level: 'debug', // logs with debug level to the active file
        filename: './.log/rcn-frontserver.log', // the filename of the current file,
        options: {flags: 'w'} // overwrites the file on restart
      }),
      new DailyRotateFile({
        level: 'verbose', // log verbose in the rotating logvile
        filename: './.log/frontserver-%DATE%.log', // the pattern of the filename
        datePattern: 'YYYY-MM-DD', // the pattern of %DATE%
        zippedArchive: true, // indicates that old logfiles should get zipped
        maxSize: '32m', // the maximum filesize
        maxFiles: '30d' // the maximum files to keep
      })
    ]
  }),
// serveroptions
  options = {
    key: fs.readFileSync('.ssh/key.pem'),   // the key-file
    cert: fs.readFileSync('.ssh/cert.pem')  // the certificate-file
  },
  port = args.port || 443, // the port the server is running on. It's the https standard
  routes = config.routes || {
    ".html": {
      "path": "./res/html", // standard route to the html files
      "mime": "text/html"
    },
    ".js": {
      "path": "./res/scripts", // standard route to the script files
      "mime": "text/javascript"
    }
  },
  mounts = config.mounts; // mounts are more important than routes.

// --- functional declaration part ---

/**
 * Creates a server running on port 80 with tls enabled.
 * @return {boolean} Returns false if the server stopped by error.
 */
function main() {
  try {
    https.createServer(options, function(req, res) {
      logger.verbose({'msg': 'Received request', 'method': req.method, 'url': req.url});

      perfy.start('response-calculation');  // caluclate the response time
      let url = urlparse.parse(req.url); // parse the url
      let uri = url.pathname;  // set uri to the urls uriame
      logger.debug({"msg": 'Got URL by using url package','url': url, 'path': uri});

      let [response, mime] = getResponse(uri); // get a response for the url path
      logger.debug({'response-length': response.length, 'mime-type': mime});

      res.writeHead(200, {"Content-Type": mime || "text/plain"}); // write the mime as head
      res.end(response);  // write the response
      let execTime = perfy.end('response-calculation').fullMilliseconds; // get the execution time
      logger.debug("Response-Time: " + execTime + " ms for " + req.url, "debug"); // log the execution time

    }).listen(port); // server listens on port specified in the parameter
  } catch (error) {
    logger.error(error);
    logger.info("Shutting Down...");
    winston.end();
    return false;
  }
}

/**
 * returns the extension of a file for the given filename.
 * @param  {String} filename The name of the file.
 * @return {String}          A string that represents the file-extension.
 */
function getExtension(filename) {
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

/**
 * Returns a string that depends on the uri It gets the data from the routes variable.
 * @param  {String} uriNormally a file-name. Depending on the extension, an other root-uriis choosen.
 * @return {String}      An Array containing (Either the files content or an error message) and the mime-type.
 */
function getResponse(uri) {
  if (!uri || uri == "/") uri = "/index.html"; // uri redirects to the index.html if it is not set or if it is root
  logger.verbose({'msg':'calculating response', 'path': uri});
  try {
    // get the file extension
    let extension = getExtension(uri);
    // returns the global script or css if the extension is css or js and the root-uriis glob.
    if (uri.includes("/glob") && (extension  == ".css" || extension == ".js")) {
      logger.verbose("Using global uri");
      if (extension == ".css") return [fs.readFileSync("." + uri), "text/css"];
      else return [fs.readFileSync("." + uri), "text/javascript"];
    }
    let mount = getMount(uri); // get mount for uri it will be uses as path later instead of route
    logger.verbose("Mount for uri is "+ mount)
    let route = routes[extension]; // get the route from the extension json
    logger.verbose("Found route: "+JSON.stringify(route))
    if (!route) return ["Not Allowed", "text/plain"]; // return not allowed if no route was found
    let rf = fs.readFileSync; // shorten filesync
    if (extension == ".html") return [formatHtml(rf(mount || path.join(route["path"]+uri))), route["mime"]]; // format if html and return
    return [rf(mount || path.join(route["path"],uri)), route["mime"]]; // return without formatting if it's not an html file. (htm files won't be manipulated)
    // test the extension for differend file types.
    logger.verbose({'msg': 'Error', 'path': uri})
    return ["Error with url", "text/plain"]; // return an error if above has not returned
  } catch (error) {
    logger.error(error);
    return ["Error", "text/plain"];
  }
}

/**
 * gets all mounted paths and returns the modified uri.
 * @param  {String} uri The uri
 * @return {String}     The uri that points to the mounted path
 */
function getMount(uri) {
  if (mounts){ // if mounts are set
    for (var mount of mounts){ // for each set mount
      if (mount.mount && mount.path) { // if the mount has the mount parameter and the path parameter
        let regEx = RegExp(mount.mount); // create a regex from the mount
        if (uri.match(regEx)) { // if there is a match
          return uri.replace(regEx, mount.path); // returnthe modified uri
        }
      }
    }
  }
  return false;
}

/**
 * Creates a css DOM element with href as source
 * @param  {Object} document A html DOM
 * @param  {String} href      the source of the css file
 * @return {Object}          the Link Element
 */
function createLinkElement(document, href) {
  let link = document.createElement('link');
  link.setAttribute("rel", "stylesheet");
  link.setAttribute("type", "text/css");
  link.setAttribute("href", href);
  return link;
}

/**
 * Creates a javascript Script DOM element with src as source
 * @param  {Object} document A html DOM
 * @param  {String} src      the source of the javascript file
 * @return {Object}          the Script Element
 */
function createScriptLinkElement(document, src) {
  let script = document.createElement("script");
  script.setAttribute("type", "text/javascript");
  script.setAttribute("src", src);
  return script;
}

/**
 * Formats the html string by adding a link to the standard css and to the standard javascript file.
 * @param  {String} htmlstring A string read from an html file or a html document string itself.
 * @return {String}            A html-string that represents a document.
 */
function formatHtml(htmlstring) {
  logger.debug({'msg': 'Formatting HTML', 'htmlstring': htmlstring});
  try {
    let dom = new JSDOM(htmlstring);  // creates a dom from the html string
    let document = dom.window.document;
    let head = document.getElementsByTagName('head')[0]; // gets the documents head
    head.prepend(createLinkElement(document, defaultCss)); // prepend the default css to the head
    head.prepend(createScriptLinkElement(document, defaultJs)); // prepend the default script to the head
    head.prepend(createScriptLinkElement(document, "/glob/jquery.js")); // prepend the JQuery to the head
    head.prepend(createScriptLinkElement(document, "/glob/vue.js")); // prepend the Vue to the head
    return dom.serialize(); // return a string of the document
  } catch(error) {
    logger.error(error);
    return htmlstring;
  }
}

// Executing the main function
if (typeof require != 'undefined' && require.main == module) {
  logger.exceptions.handle(
    new winston.transports.File({
      filename: './.log/frontserver-exceptions.log'
    })
  );
  logger.info("Starting up... ");  // log the current date so that the logfile is better to read.
  main();
}
