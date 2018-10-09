/**
 * Preprocesses html-files
 */
const fs = require("fs"),
    { JSDOM } = require('jsdom'),
// ressources
    defaultCss = "/glob/style.sass", // the default style that is embedded in every html
    defaultJs = "/glob/script.js"; // the default script that is embedded in every html

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
 * @return {String}  A html-string that represents a document.
 * @param filename
 */
exports.formatHtml = function (filename) {
    let htmlstring = fs.readFileSync(filename);
    try {
        let dom = new JSDOM(htmlstring); // creates a dom from the html string
        let document = dom.window.document;
        let head = document.getElementsByTagName('head')[0]; // gets the documents head
        head.prepend(createLinkElement(document, defaultCss)); // prepend the default css to the head
        head.prepend(createScriptLinkElement(document, defaultJs)); // prepend the default script to the head
        head.prepend(createScriptLinkElement(document, "/glob/jquery.js")); // prepend the JQuery to the head
        head.prepend(createScriptLinkElement(document, "/glob/vue.js")); // prepend the Vue to the head
        return dom.serialize(); // return a string of the document
    } catch (error) {
        console.error(error);
        return htmlstring;
    }
};
