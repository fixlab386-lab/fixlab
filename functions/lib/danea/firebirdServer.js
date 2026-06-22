"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareDatabaseFile = prepareDatabaseFile;
exports.ensureFirebirdServer = ensureFirebirdServer;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_net_1 = require("node:net");
let serverReady = null;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isPortOpen(port, host = '127.0.0.1') {
    return new Promise(resolve => {
        const socket = (0, node_net_1.createConnection)({ port, host });
        socket.setTimeout(500);
        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });
    });
}
/** Rende il database leggibile dal demone Firebird nel container. */
function prepareDatabaseFile(dbPath) {
    try {
        (0, node_fs_1.chmodSync)(dbPath, node_fs_1.constants.S_IRUSR |
            node_fs_1.constants.S_IWUSR |
            node_fs_1.constants.S_IRGRP |
            node_fs_1.constants.S_IWGRP |
            node_fs_1.constants.S_IROTH |
            node_fs_1.constants.S_IWOTH);
    }
    catch {
        /* ignore permission errors */
    }
    if (process.platform === 'linux' && process.getuid?.() === 0) {
        try {
            (0, node_child_process_1.execSync)(`chown firebird:firebird "${dbPath}"`, { stdio: 'ignore' });
        }
        catch {
            /* ignore */
        }
    }
}
function ensureFirebirdServer() {
    if (!serverReady)
        serverReady = startFirebirdServer();
    return serverReady;
}
async function startFirebirdServer() {
    if (await isPortOpen(3050))
        return;
    if (process.platform === 'linux') {
        try {
            (0, node_child_process_1.execSync)('service firebird3.0 start', { stdio: 'pipe', timeout: 20000 });
        }
        catch {
            try {
                (0, node_child_process_1.spawn)('/usr/sbin/fbguard', ['-daemon'], { detached: true, stdio: 'ignore' }).unref();
            }
            catch {
                /* ignore */
            }
        }
    }
    for (let i = 0; i < 40; i++) {
        if (await isPortOpen(3050))
            return;
        await sleep(500);
    }
    throw new Error('FIREBIRD_SERVER_UNAVAILABLE');
}
//# sourceMappingURL=firebirdServer.js.map