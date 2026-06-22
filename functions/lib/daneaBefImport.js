"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importDaneaBef = void 0;
const https_1 = require("firebase-functions/v2/https");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const node_crypto_1 = require("node:crypto");
const node_fs_1 = require("node:fs");
const auth_1 = require("./auth");
const callableOptions_1 = require("./callableOptions");
const befExtract_1 = require("./danea/befExtract");
const importErrors_1 = require("./danea/importErrors");
const firebirdClient_1 = require("./danea/firebirdClient");
const importRunner_1 = require("./danea/importRunner");
const db = (0, firestore_1.getFirestore)('fixlab');
exports.importDaneaBef = (0, https_1.onCall)({
    ...callableOptions_1.europeWest1Callable,
    timeoutSeconds: 3600,
    memory: '4GiB',
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const { studioId, storagePath, options } = request.data ?? {};
    if (!studioId || !storagePath) {
        throw new https_1.HttpsError('invalid-argument', 'studioId e storagePath sono obbligatori.');
    }
    if (!storagePath.startsWith(`studios/${studioId}/danea-imports/`)) {
        throw new https_1.HttpsError('invalid-argument', 'Percorso file non valido.');
    }
    await (0, auth_1.assertStudioAccess)(request.auth.uid, studioId);
    const importId = (0, node_crypto_1.randomUUID)();
    const jobRef = db.collection('studios').doc(studioId).collection('daneaImports').doc(importId);
    const updateJob = async (patch) => {
        await jobRef.set({ ...patch, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
    };
    await updateJob({
        status: 'pending',
        message: 'Download file in corso…',
        done: 0,
        total: 0,
    });
    void processImport(studioId, storagePath, options, updateJob).catch(async (err) => {
        await updateJob({
            status: 'error',
            error: err instanceof Error
                ? err.message
                : 'Importazione .bef non riuscita. Esporta gli Excel da Danea oppure carica il file .eft dall’archivio.',
        });
    });
    return { importId };
});
async function processImport(studioId, storagePath, options, updateJob) {
    let workDir = null;
    try {
        const bucket = (0, storage_1.getStorage)().bucket();
        const file = bucket.file(storagePath);
        const [buffer] = await file.download();
        const originalName = storagePath.split('/').pop() ?? 'archive.bef';
        await updateJob({ status: 'running', message: 'Analisi archivio Danea…', phase: 'clients' });
        const extracted = (0, befExtract_1.extractDaneaArchiveFile)(buffer, originalName);
        workDir = extracted.workDir;
        if (extracted.spreadsheets.length && !extracted.databasePath) {
            throw new Error('Il .bef contiene file Excel: trascinali separatamente nell’import oppure usa l’archivio .eft da Danea.');
        }
        if (extracted.befProprietary || (!extracted.databasePath && originalName.toLowerCase().endsWith('.bef'))) {
            throw new Error(importErrors_1.BEF_PROPRIETARY_MESSAGE);
        }
        if (!extracted.databasePath) {
            throw new Error(importErrors_1.BEF_PROPRIETARY_MESSAGE);
        }
        const dbPath = (0, befExtract_1.copyDatabaseForRead)(extracted.databasePath, extracted.workDir);
        let canConnect = false;
        try {
            canConnect = await (0, firebirdClient_1.testFirebirdConnection)(dbPath);
        }
        catch (err) {
            if (err instanceof Error && err.message === 'FIREBIRD_SERVER_UNAVAILABLE') {
                throw new Error(importErrors_1.FIREBIRD_UNAVAILABLE_MESSAGE);
            }
            throw err;
        }
        if (!canConnect) {
            throw new Error(originalName.toLowerCase().endsWith('.bef') ? importErrors_1.BEF_PROPRIETARY_MESSAGE : importErrors_1.EFT_READ_ERROR_MESSAGE);
        }
        await updateJob({ message: 'Lettura database Easyfatt…' });
        const data = await (0, firebirdClient_1.readEasyfattDatabase)(dbPath);
        if ((0, importRunner_1.isExtractEmpty)(data)) {
            throw new Error('Nessun dato trovato nel database Danea. Verifica che il .bef non sia corrotto.');
        }
        const totals = (0, importRunner_1.countExtract)(data);
        await updateJob({
            message: `Trovati: ${totals.clients} clienti, ${totals.suppliers} fornitori, ${totals.products} prodotti, ${totals.documents} documenti`,
            total: (options.importClients ? totals.clients : 0) +
                (options.importSuppliers ? totals.suppliers : 0) +
                (options.importProducts ? totals.products : 0) +
                (options.importDocuments ? totals.documents : 0),
        });
        const result = await (0, importRunner_1.importEasyfattExtract)(studioId, data, options, updateJob);
        await updateJob({
            status: 'done',
            phase: 'done',
            message: 'Importazione completata.',
            result,
        });
        try {
            await file.delete();
        }
        catch {
            /* ignore */
        }
    }
    finally {
        if (workDir) {
            try {
                (0, node_fs_1.rmSync)(workDir, { recursive: true, force: true });
            }
            catch {
                /* ignore */
            }
        }
    }
}
//# sourceMappingURL=daneaBefImport.js.map