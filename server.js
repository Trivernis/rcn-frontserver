// requirement
var protocoll = require('https');
const fs = require('fs'),
    urlparse = require('url'),
    perfy = require('perfy'),
    winston = require('winston'),
    DailyRotateFile = require('winston-daily-rotate-file'),
    path = require('path'),
// own modules
    utils = require("./lib/utils"),
    prepro = require("./lib/preprocessor"),
// cleanup
    clean = utils.Cleanup(cleanup),
// args
    args = require('args-parser')(process.argv), // create an args parser
// config file
    config = JSON.parse(fs.readFileSync("./config/server.json")),

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
// these will store the certificate options later
var options = {};

// --- functional declaration part ---

/**
 * Creates a server running on port 80 with tls enabled.
 * @return {boolean} Returns false if the server stopped by error.
 */
function main() {
    try {
        prepro.setLogger(logger);
        protocoll.createServer(options, function (req, res) {
            logger.verbose({'msg': 'Received request', 'method': req.method, 'url': req.url});

            perfy.start('response-calculation');  // caluclate the response time
            let url = urlparse.parse(req.url); // parse the url
            let uri = url.pathname;  // set uri to the urls uriame
            logger.debug({"msg": 'Got URL by using url package', 'url': url, 'path': uri});

            let resArray = getResponse(uri); // get a response for the url path
            let response = resArray[0] || "", // the response
              mime = resArray[1] || "text/plain", // the mime-type
              statuscode = resArray[2] || 200; // the status code. 200 if not explicitly set
            logger.debug({'response-length': response.length, 'mime-type': mime, 'code': statuscode});
            res.writeHead(statuscode, {"Content-Type": mime}); // write the mime as head
            res.end(response);  // write the response
            let execTime = perfy.end('response-calculation').fullMilliseconds; // get the execution time
            logger.debug("Response-Time: " + execTime + " ms for " + req.url, "debug"); // log the execution time
        }).listen(port); // server listens on port specified in the parameter
    } catch (error) {
        logger.error(error.message);
        process.exit(1);
    }
}

/**
 * Returns a string that depends on the uri It gets the data from the routes variable.
 * @param uri
 * @return {string[]}  An Array containing the files content, the mime type and sometimes the statuscode (if it is not 200)
 */
function getResponse(uri) {
    let matches = uri.match(/(\/$|\/\w+$)/g); // matches when the url has no file extension or ends in a slash (/)
    if (matches) uri += '/index.html'; // append index.html if there are matches
    logger.verbose({'msg': 'calculating response', 'path': uri});
    let gp = prepro.getProcessed; // shorten the function name
    try {
        let extension = utils.getExtension(uri); // get the urls file-extension
        // returns the global script or css if the extension is css or js and the root-uriis glob.
        if (uri.includes("/glob") && (extension === ".sass" || extension === ".js")) {
            logger.verbose("Using global uri");
            if (extension === ".sass") return [gp("." + uri), "text/css"];
            else return [gp("." + uri), "text/javascript"];
        }
        let mount = getMount(uri); // get mount for uri it will be uses as path later instead of route
        logger.verbose("Mount for uri is " + mount);
        let route = routes[extension]; // get the route from the extension json
        logger.verbose("Found route: " + JSON.stringify(route));

        if (!route) {
            logger.warn(`No route found for ${uri}`);
            return [gp(config.errors['403']), "text/html", 403]; // return not allowed if no route was found
        }
        return [gp(mount || path.join(route["path"], uri)), route["mime"]]; // get processed output (done by preprocessor)
    } catch (error) {
        logger.warn(error.message);
        if (args.test) process.exit(1);
        return [gp(config.errors['404']), "text/html", 404];
    }
}

/**
 * gets all mounted paths and returns the modified uri.
 * @param  {String} uri The uri
 * @return {String}     The uri that points to the mounted path
 */
function getMount(uri) {
    if (mounts) { // if mounts are set
        for (let mount of mounts) { // for each set mount
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

function cleanup() {
  logger.info('Cleanup...');
  prepro.cleanup(); // cleanup the preprocessor
  logger.end();     // let the logger finish all operations
}

// Executing the main function
if (typeof require !== 'undefined' && require.main === module) {
    logger.exceptions.handle(
        new winston.transports.File({
            filename: './.log/frontserver-exceptions.log'
        })
    );
    if (fs.existsSync('.ssh/key.pem') && fs.existsSync('.ssh/cert.pem')) { // check if the required cert files exists
      options = {
          key: fs.readFileSync('.ssh/key.pem'),   // the key-file
          cert: fs.readFileSync('.ssh/cert.pem')  // the certificate-file
      };
    } else protocoll = require('http'); // if no certs could be found start the server as http-server
    logger.info("Starting up... ");  // log the current date so that the logfile is better to read.
    if (args.test) {
      setTimeout(() => process.exit(0), 10000); // if in testing mode, exit after 10 seconds
    }
    main();
}
