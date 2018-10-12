rcn-frontserver <img src="https://raw.githubusercontent.com/Trivernis/rcn-frontserver/develop/res/img/RCN-Logo.png" height="100px" width="auto"></img>
====
This is the front-end web-server of the Raspberry Communication Network *(that is still in development)*.

Contents
----
1. [Requirements](#requirements)
2. [Getting Started](#getting-started)
3. [Arguments](#arguments)
4. [Configuration](#configuration)
    1. [Routes for each type of file](#routes-for-each-type-of-file)
    2. [Mounting external folders](#mounting-external-folders)
5. [Cool Features](#cool-features)
6. [Roadmap](#roadmap)

Requirements
----
You need to have Node.js installed to run this script. Just in case update your npm with the command:
```commandline
npm install -g npm@latest
```

Getting started
----
 To install the dependencies listed above, run the following from the commandline.
```commandline
npm install
```
Now you can run the server by typing:
```commandline
node server.js
```

Arguments
----
Just type `node server.js -h` or
```commandline
Usage: server.js [options]

Options:
   -h, --help  show this help message and exit
   -p, --port  define the port for the server to run on
   --loglevel  define at which level the console should output
   --test      start the server and exit after 10 seconds
```

Configuration
----
*This configuration applies to the server.json.*

### Routes for each type of file
In the server.json all common web file-types have their own configuration at **routes**.
```json
{
  "routes": {
    ".html": {
      "path": "./res/html/",
      "mime": "text/html"
    }
  }
}
```
In the configuration a path and mime-type is defined. When the server starts recieves a request, it reads the configuration and searches for the file in the specific route. If the file exists it gets transportet with the defined mime-type. The type of the file is determined with the file's extension.

### Mounting external folders
It is also possible to mount additional folders into the web-application by defining them at **mounts**. Mounts are more important than routes so when the server recieves a request, it first looks if the request-url has a mounted directory (or file).

```json
{
  "mounts": [
    {
      "path": "./path/to/directory/",
      "mount": "/mount/"
    }
  ]
}
```
The path Attribute defines the mounted directory (of file) on the local filesystem. The mount attribute defines where the directory is mounted in the web-application. The mount-path supports RegEx strings (the value is interpreted as a regular Expression by default).

Cool features
---
### Embedding SASS-Stylesheets, Vue.js and jQuery
This server automatically embeds Vue.js, jQuery and the *script.js* and *style.sass* stored in *./glob*. And yeah, that's right. You can embed .sass-files. When encountering a .sass file, the server compiles it into .css. The result will then be stored in the *./.cache* directory. The server also detects changes on the original file and refreshes the cached file when the change was detected. The refreshing only happens, when the file was requested.

Roadmap
----
- [x] SASS-Files and caching of preprocessed files
- [x] Mounting of folders or files on other locations (by using the config.json)
- [x] A package.json because it seems to be important nowadays
- [x] HTTP-Statuscode integration with specific pages
- [ ] Handling POST-Methods
- [ ] Integrating Backend-Applications via a standardized JSON-interface
- [ ] Change from JSON to CSON and consider this in the standardized interface