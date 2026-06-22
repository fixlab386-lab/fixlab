"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDaneaArchiveFile = extractDaneaArchiveFile;
exports.copyDatabaseForRead = copyDatabaseForRead;
exports.archiveExtension = archiveExtension;
const adm_zip_1 = __importDefault(require("adm-zip"));
const node_child_process_1 = require("node:child_process");
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_os_1 = require("node:os");
const node_crypto_1 = require("node:crypto");
const _7zip_bin_1 = __importDefault(require("7zip-bin"));
const SPREADSHEET_EXT = /\.(xlsx|xls|csv|ods)$/i;
const ARCHIVE_EXT = /\.(eft|efs|fdb)$/i;
function walkFiles(dir, acc = []) {
    for (const name of (0, node_fs_1.readdirSync)(dir)) {
        const full = (0, node_path_1.join)(dir, name);
        const st = (0, node_fs_1.statSync)(full);
        if (st.isDirectory())
            walkFiles(full, acc);
        else
            acc.push(full);
    }
    return acc;
}
function scanExtractedDir(workDir) {
    const spreadsheets = [];
    let databasePath = null;
    for (const filePath of walkFiles(workDir)) {
        const name = (0, node_path_1.basename)(filePath);
        if (SPREADSHEET_EXT.test(name)) {
            spreadsheets.push({ name, path: filePath });
        }
        else if (ARCHIVE_EXT.test(name) && !databasePath) {
            databasePath = filePath;
        }
    }
    return { databasePath, spreadsheets };
}
function tryZipExtract(buffer, workDir) {
    try {
        const zip = new adm_zip_1.default(buffer);
        zip.extractAllTo(workDir, true);
        return true;
    }
    catch {
        return false;
    }
}
function is7zArchive(buffer) {
    return buffer.length >= 6 && buffer.subarray(0, 6).equals(Buffer.from([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]));
}
function try7zExtract(buffer, workDir) {
    if (!is7zArchive(buffer))
        return false;
    const archivePath = (0, node_path_1.join)(workDir, 'upload.bef');
    try {
        (0, node_fs_1.writeFileSync)(archivePath, buffer);
        (0, node_child_process_1.execFileSync)(_7zip_bin_1.default.path7za, ['x', archivePath, `-o${workDir}`, '-y'], { timeout: 120_000 });
        return true;
    }
    catch {
        return false;
    }
}
/** Estrae da .bef / .eft: zip/7z interno, file Excel o database Easyfatt. */
function extractDaneaArchiveFile(buffer, originalName) {
    const workDir = (0, node_path_1.join)((0, node_os_1.tmpdir)(), `fixlab-danea-${(0, node_crypto_1.randomUUID)()}`);
    (0, node_fs_1.mkdirSync)(workDir, { recursive: true });
    const lower = originalName.toLowerCase();
    if (lower.endsWith('.eft') || lower.endsWith('.efs') || lower.endsWith('.fdb')) {
        const dbPath = (0, node_path_1.join)(workDir, (0, node_path_1.basename)(originalName));
        (0, node_fs_1.writeFileSync)(dbPath, buffer);
        return { workDir, databasePath: dbPath, spreadsheets: [], befProprietary: false };
    }
    if (tryZipExtract(buffer, workDir)) {
        const scanned = scanExtractedDir(workDir);
        if (scanned.databasePath || scanned.spreadsheets.length) {
            return { workDir, ...scanned, befProprietary: false };
        }
    }
    if (try7zExtract(buffer, workDir)) {
        const scanned = scanExtractedDir(workDir);
        if (scanned.databasePath || scanned.spreadsheets.length) {
            return { workDir, ...scanned, befProprietary: false };
        }
    }
    if (lower.endsWith('.bef')) {
        return { workDir, databasePath: null, spreadsheets: [], befProprietary: true };
    }
    return { workDir, databasePath: null, spreadsheets: [], befProprietary: false };
}
function copyDatabaseForRead(sourcePath, workDir) {
    const dest = (0, node_path_1.join)(workDir, `read-${(0, node_path_1.basename)(sourcePath)}`);
    (0, node_fs_1.copyFileSync)(sourcePath, dest);
    return dest;
}
function archiveExtension(path) {
    return (0, node_path_1.extname)(path).toLowerCase();
}
//# sourceMappingURL=befExtract.js.map