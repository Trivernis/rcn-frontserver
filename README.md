rcn-frontserver
====

About
----
This is the front-web-server of the Raspberry pi Communication network.

Modules
----
**NodeJS**
-   winston
-   pkg
-   perfy
-   jsdom
-   winston-daily-rotate-file
-   args-parser

**Embedded in the html-file**
-   JQuery
-   Vue.js

Details
----
This web server uses folders for every type of file (depending on the file's ending) and routes to the folders. There are also global files, that are implemented in every html via dom-manipulation. The behaviour for every file extension can be configured in the config.json This server uses vue.js and jquery to make the website as interactive, as possible. This server works with https. To run it. it needs to have access to the folder .ssh in the same directory where a valid cert.pem and a valid key.pem is are existing. Specific directories can be mounted via the mounting parameter. The pattern is:
``` json
{
  "mounts": [
    {
      "mount": "mountpath",
      "path": "path"
    }
  ]
}
```

Roadmap
----
**Done**

**ToDo**
-   Mounting of folders or files on other locations (by using the config.json)
-   a package.json because it seems to be important nowadays
