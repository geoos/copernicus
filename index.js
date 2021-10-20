const log = require("./lib/Logs")
const downloader = require("./lib/Downloader")

console.log("Starting copernicus downloader ...");
downloader.init();
log.info("Coernicus downloader initialized");