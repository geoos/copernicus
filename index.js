const log = require("./lib/Logs")
const downloader = require("./lib/Downloader")

downloader.init();
log.info("Coernicus downloader initialized");