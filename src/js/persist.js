const electron = require("electron");
const fs = require("fs");
const path = require("path");

const userDataFolder =
    process.env.APPDATA ||
    (process.platform == "darwin" ? process.env.HOME + "/Library/Preferences" : process.env.HOME + "/.local/share");

export const UserDataPath = path.join(userDataFolder, "RobloxDesktop");

if (!fs.existsSync(UserDataPath)) fs.mkdirSync(UserDataPath, { recursive: true });

function getFileData(path, defaults) {
    try {
        return JSON.parse(fs.readFileSync(path));
    } catch (e) {
        return defaults;
    }
}

class Store {
    constructor(key, defaults) {
        this.key = key;
        this.path = path.join(UserDataPath, key + ".json");

        this.data = getFileData(this.path, defaults);
    }

    get(idx) {
        return this.data[idx];
    }

    set(idx, val) {
        this.data[idx] = val;
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }
}

export async function getStore(key, defaults = {}) {
    return new Store(key, defaults);
}
