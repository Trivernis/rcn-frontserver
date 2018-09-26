// requirement
const https = require('https'),
  fs = require('fs'),
  urlparse = require('url'),
  { JSDOM } = require('jsdom'),
  perfy = require('perfy'),
  winston = require('winston'),
  DailyRotateFile = require('winston-daily-rotate-file'),
// args
  args = require('args-parser')(process.argv),
// ressources
  defaultCss = "/glob/style.css",
  defaultJs = "/glob/script.js",
// logging config using winston
  fileLoggingFormat = winston.format.printf(info => {
    return `${info.timestamp} ${info.level.toUpperCase()}: ${JSON.stringify(info.message)}`;
  });
  consoleLoggingFormat = winston.format.printf(info => {
    return `${info.timestamp} [${info.level}] ${JSON.stringify(info.message)}`;
  });
  loggingFullFormat = winston.format.combine(
    winston.format.splat(),
    winston.format.timestamp({
      format: 'MM-DD HH:mm:ss.SSS'
    }),
    fileLoggingFormat
  ),
  logger = winston.createLogger({
    level: winston.config.npm.levels,
    format: loggingFullFormat,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.splat(),
          winston.format.timestamp({
            format: 'YY-MM-DD HH:mm:ss.SSS'
          }),
          consoleLoggingFormat
        ),
        level: args.loglevel || 'info'
      }),
      new winston.transports.File({
        level: 'debug',
        filename: './.log/rcn-frontserver.log'
      }),
      new DailyRotateFile({
        level: 'verbose',
        filename: './.log/frontserver-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '32m',
        maxFiles: '30d'
      })
    ]
  }),
// serveroptions
  options = {
    key: fs.readFileSync('.ssh/key.pem'),   // the key-file
    cert: fs.readFileSync('.ssh/cert.pem')  // the certificate-file
  },
  port = args.port || 80; // The port of the web server.

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
 * Returns a string that depends on the path.
 * @param  {String} path Normally a file-name. Depending on the extension, an other root-path is choosen.
 * @return {String}      An Array containing (Either the files content or an error message) and the mime-type.
 */
function getResponse(path) {
  logger.verbose({'msg':'calculationg response', 'path': path});
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
    // test the extension for differend file types.
    switch (extension) {
      case '.html':
      case '.htm':
        return [formatHtml(fs.readFileSync("./res/html/" + path)), "text/html"];
      case '.css':
        return [fs.readFileSync("./res/css/"+path), "text/css"];
      case '.js':
        return [fs.readFileSync("./res/scripts/"+path), "text/javascript"];
      case '.json':
        return [fs.readFileSync("./res/data/"+path), "text/plain"];
      // return some images
      case '.ico':
        return [fs.readFileSync("./res/img/"+path), "image/x-icon"]
      case '.jpg':
        return [fs.readFileSync("./res/img/"+path), "image/jpeg"];
      case '.png':
        return [fs.readFileSync("./res/img/"+path), "image/png"];
      // return some videos
      case '.mp4':
        return [fs.readFileSync("./res/vid/"+path), "video/mpeg"];
      // default return
      default:
        // if the extension is not in those above, the access is not allowed.
        logger.verbose({'msg': 'Illegal request', 'path': path})
        return ["Not Allowed", "text/plain"];
    }
  } catch (error) {
    logger.error(error);
    return "Error";
  }
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
    let css = document.createElement('link'); // create a link for the css embeding
    css.setAttribute("rel", "stylesheet");
    css.setAttribute("type", "text/css");
    css.setAttribute("href", defaultCss);
    head.prepend(css); // prepend the link to the head
    let js = document.createElement('script'); // create a script for js embedding
    js.setAttribute("type", "text/javascript");
    js.setAttribute("src", defaultJs);
    head.prepend(js); // prepend the script to the head
    let jquery = document.createElement('script'); // create a script for js embedding
    jquery.setAttribute("type", "text/javascript");
    jquery.setAttribute("src", "/glob/jquery.js");
    head.prepend(jquery); // prepend the script to the head
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
