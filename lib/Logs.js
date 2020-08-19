const config = require("./Config");
const moment = require("moment-timezone");
const fs = require("fs");

class Logs {
    static get instance() {
        if (Logs.singleton) return Logs.singleton;
        Logs.singleton = new Logs();
        return Logs.singleton;
    }

    constructor() {
        this.callDeleterDaemon(5000);
    }

    writeLog(level, txt) {
        let now = moment.tz(config.timeZone);
        let path = config.logPath + "/" + config.logPrefix + now.format("YYYY-MM-DD") + ".log";
        let hhmm = now.format("HH:mm:ss");
        fs.appendFileSync(path, hhmm + " [" + level + "] " + txt + "\n");
    }

    debug(txt) {
        if (config.logLevel != "debug") return;
        this.writeLog("debug", txt);
    }
    info(txt) {
        if (config.logLevel != "debug" && config.logLevel != "info") return;
        this.writeLog("info", txt);
    }
    warn(txt) {
        if (config.logLevel != "debug" && config.logLevel != "info" && config.logLevel != "warning") return;
        this.writeLog("warn", txt);
    }
    error(txt) {
        this.writeLog("error", txt);
    }

    callDeleterDaemon(ms = 600000) {
        if (this.timerDeleterDaemon) clearTimeout(this.timerDeleterDaemon);
        this.timerDeleterDaemon = setTimeout(_ => {
            this.timerDeleterDaemon = null;
            this.deleterDaemon();
        }, ms)
    }

    deleterDaemon() {
        try {
            if (!config.logRetain) return;
            let treshold = moment.tz(config.timeZone).startOf("day").subtract(config.logRetain, "days");
            let path = config.logPath;
             let files = fs.readdirSync(path);
             files.forEach(f => {
                 if (f.startsWith(config.logPrefix)) {
                    let name = f.substr(config.logPrefix.length);
                    name = name.substr(0, name.length - 4);
                    let time = moment.tz(name, config.timeZone);
                    if (time.isBefore(treshold)) {
                        try {
                            fs.unlinkSync(path + "/" + f);
                        } catch(error) {
                            console.log("Error deleting old log:" + error);
                        }
                    }
                 }
             })
        } catch(error) {
            console.error(error);
        } finally {
            this.callDeleterDaemon();
        }
    }
}

module.exports = Logs.instance;