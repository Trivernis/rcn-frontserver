// requirement
const https = require('https'),
  fs = require('fs'),
  urlparse = require('url'),
  { JSDOM } = require('jsdom'),
  perfy = require('perfy'),
  winston = require('winston'),
  DailyRotateFile = require('winston-daily-rotate-file'),
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
  port = args.port || 80,
  routes = config.routes || {
    ".html": {
      "path": "./res/html",
      "mime": "text/html"
    },
    ".js": {
      "path": "./res/scripts",
      "mime": "text/javascript"
    }
  }
  ; // The port of the web server.

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
      let path = url.pathname;  // set path to the urls pathname
      logger.debug({msg: 'Got URL by using url package','url': url, 'path': path});

      let [response, mime] = getResponse(path); // get a response for the url path
      logger.debug({'response-length': response.length, 'mime-type': mime});

      res.writeHead(200, {"Content-Type": mime}); // write the mime as head
      res.end(response);  // write the response
      let execTime = perfy.end('response-calculation').fullMilliseconds; // get the execution time
      logger.debug("Response-Time: " + execTime + " ms for " + req.url, "debug"); // log the execution time

    }).listen(port); // server listens on port specified in the parameter
  } catch (error) {
    logger.error(error);
    logger.info("Shutting Down...");
    return false;
  }
}

/**
 * returns the extension of a file for the given filename.
 * @param  {String} filename The name of the file.
 * @return {String}          A string that represents the file-extension.
 */
function getExtension(filename) {
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
 * Returns a string that depends on the path. It gets the data from the routes variable.
 * @param  {String} path Normally a file-name. Depending on the extension, an other root-path is choosen.
 * @return {String}      An Array containing (Either the files content or an error message) and the mime-type.
 */
function getResponse(path) {
  logger.verbose({'msg':'calculating response', 'path': path});
  try {
    // get the file extension
    let extension = getExtension(path);
    // returns the home-html file if the path is root.
    if (path == "/") return [fs.readFileSync("./glob/home.html"), "text/html"];
    // returns the global script or css if the extension is css or js and the root-path is glob.
    if (path.includes("/glob") && extension  == ".css" || getExtension(path) == ".js") {
      if (extension == ".css") return [fs.readFileSync("." + path), "text/css"];
      else return [fs.readFileSync("." + path), "text/javascript"];
    }
    let route = routes[extension];
    if (!route) return ["Not Allowed", "text/plain"];
    let rf = fs.readFileSync;
    if (extension == ".html") return [formatHtml(rf(route["path"]+path)), route["mime"]];
    return [rf(route["path"]+path), route["mime"]];
    // test the extension for differend file types.
    logger.verbose({'msg': 'Error', 'path': path})
    return ["Error with url", "text/plain"];
  } catch (error) {
    logger.error(error);
    return "Error";
  }
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
  logger.verbose({'msg': 'Formatting HTML', 'htmlstring': htmlstring});
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
