const config = require("./Config");
const fs = require("fs");
const log = require("./Logs");
const moment = require("moment-timezone");
const motuClient  = require("./MOTUClient");

class Downloader {
    static get instance() {
        if (Downloader.singleton) return Downloader.singleton;
        Downloader.singleton = new Downloader();
        return Downloader.singleton;
    }

    constructor() {
        this.code = "copernicus";
    }

    getState() {        
        try {
            let j = fs.readFileSync(config.dataPath + "/download/" + this.code + "-state.json");
            if (j) return JSON.parse(j);
            return {};
        } catch (error) {
            return {}
        }
    }
    setState(state) {
        fs.writeFileSync(config.dataPath + "/download/" + this.code + "-state.json", JSON.stringify(state));
    }
    init() {
        console.log("debug. Init copernicus");
        // Check f or download path existance
        let downloadPath = config.dataPath + "/download";
        if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);
        let importPath = config.dataPath + "/import";
        if (!fs.existsSync(importPath)) fs.mkdirSync(importPath);
        let configFilePath = config.configPath + "/copernicus-downloader.hjson";
        if (!fs.existsSync(configFilePath)) {
            fs.copyFileSync("./lib/res/copernicus-downloader-sample-config.hjson", configFilePath);
        }
        configFilePath = config.configPath + "/copernicus-CHL-L4.hjson";
        if (!fs.existsSync(configFilePath)) {
            fs.copyFileSync("./lib/res/copernicus-CHL-L4.hjson", configFilePath);
        }
        configFilePath = config.configPath + "/copernicus-PHY-L4.hjson";
        if (!fs.existsSync(configFilePath)) {
            fs.copyFileSync("./lib/res/copernicus-PHY-L4.hjson", configFilePath);
        }
        configFilePath = config.configPath + "/copernicus-SST-L4.hjson";
        if (!fs.existsSync(configFilePath)) {
            fs.copyFileSync("./lib/res/copernicus-SST-L4.hjson", configFilePath);
        }

        // Cancel pending downloads from last run
        let files = fs.readdirSync(downloadPath);
        files.forEach(f => {
            try {
                if (f.startsWith(this.code + "_") && f.endsWith(".nc")) {
                    fs.unlinkSync(downloadPath + "/" + f);
                }
            } catch(err) {}
        })

        this.callDaemon(2000);
    }

    callDaemon(ms = 60000) {
        if (this.daemonTimer) clearTimeout(this.daemonTimer);
        this.daemonTimer = setTimeout(_ => {
            this.daemonTimer = null;
            this.daemon();
        }, ms);
    }
    async daemon() {
        if (!config.downloaderActive) {
            log.debug("Downloader deactivated");
            return;
        }
        try {
            if (this.running) {
                log.warn("Daemon runing when called. Ignoring");
                return;
            }
            log.debug("Starting daemon");
            let state = await this.getState();
            if (!state) state = {};
            let now = moment.tz("UTC");
            
            for (let i=0; i<config.config.products.length; i++) {
                let nTries = 0, success = false;
                do {
                    try {                        
                        await this.downloadProduct(config.config.products[i], state, now);
                        success = true;
                        await this.setState(state);
                    } catch(error) {
                        // probar con un dia anterior antes de descartar
                        let yesterday = now.clone();
                        yesterday.date(now.date() - 1);
                        try {
                            log.debug(" ... trying day before");
                            await this.downloadProduct(config.config.products[i], state, yesterday);
                            success = true;
                            await this.setState(state);
                        } catch(error) {
                            console.error(error);
                            log.error(error.toString());
                            success = false;    
                        }
                    }
                } while (!success && ++nTries < 5);
            }
        } catch(error) {
            console.error(error);
            log.error("Unexpected error in daemon:" + error.toString())
        } finally {
            log.debug("Daemon Finished");
            this.running = false;
            this.callDaemon();
        }
    }

    async downloadProduct(product, state, time) {
        try {
            let downloadDate = time.clone().subtract(1, "days").startOf("day");
            let fmtDownloadDate = downloadDate.format(product.publishDateFormat);
            let outName =  product.dataSetCode + "_" + downloadDate.format("YYYY-MM-DD");
            if (state[product.dataSetCode] == fmtDownloadDate) return;
            log.debug("Downloading Product: " + product.dataSetCode);
            let outDir = config.dataPath + "/download"
            try {
                await motuClient.download(product, fmtDownloadDate, outDir, outName + ".nc");
                console.log("*** Downloaded");
                fs.renameSync(outDir + "/" + outName + ".nc", config.dataPath + "/import/" + outName + ".nc")
                console.log("*** Renamed", config.dataPath + "/import/" + outName + ".nc");
                state[product.dataSetCode] = fmtDownloadDate;                
                log.debug("  --> Download OK");
                console.log("*** OK");
            } catch(error) {
                log.error(error.toString())
                console.error(error);
                throw error;
            }
        } catch(error) {
            throw error;
        }
    }
}

module.exports = Downloader.instance;