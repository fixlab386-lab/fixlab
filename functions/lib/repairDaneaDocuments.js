"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.repairDaneaDocuments = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const node_fs_1 = require("node:fs");
const auth_1 = require("./auth");
const callableOptions_1 = require("./callableOptions");
const batchWriter_1 = require("./danea/batchWriter");
const befExtract_1 = require("./danea/befExtract");
const importErrors_1 = require("./danea/importErrors");
const firebirdClient_1 = require("./danea/firebirdClient");
const documentRepair_1 = require("./danea/documentRepair");
const importRunner_1 = require("./danea/importRunner");
const db = (0, firestore_1.getFirestore)('fixlab');
const DOC_PAGE = 400;
async function loadStudioDocuments(studioId) {
    const docs = [];
    let lastDoc;
    for (;;) {
        let q = db.collection('documents').where('studioId', '==', studioId).orderBy('createdAt', 'desc').limit(DOC_PAGE);
        if (lastDoc)
            q = q.startAfter(lastDoc);
        const snap = await q.get();
        if (snap.empty)
            break;
        for (const d of snap.docs) {
            docs.push((0, documentRepair_1.mapFirestoreDoc)(d.id, d.data()));
        }
        if (snap.docs.length < DOC_PAGE)
            break;
        lastDoc = snap.docs[snap.docs.length - 1];
    }
    return docs;
}
async function repairFromArchive(studioId, storagePath, existingDocs, clientIndex, supplierIndex) {
    if (!storagePath.startsWith(`studios/${studioId}/danea-imports/`)) {
        throw new https_1.HttpsError('invalid-argument', 'Percorso file non valido.');
    }
    let workDir = null;
    try {
        const bucket = (0, storage_1.getStorage)().bucket();
        const file = bucket.file(storagePath);
        const [buffer] = await file.download();
        const originalName = storagePath.split('/').pop() ?? 'archive.eft';
        const extracted = (0, befExtract_1.extractDaneaArchiveFile)(buffer, originalName);
        workDir = extracted.workDir;
        if (!extracted.databasePath) {
            throw new https_1.HttpsError('failed-precondition', 'Carica il file .eft dall’archivio Danea (Documenti → Danea Easyfatt → Archivi) per una riparazione precisa.');
        }
        const dbPath = (0, befExtract_1.copyDatabaseForRead)(extracted.databasePath, extracted.workDir);
        const canConnect = await (0, firebirdClient_1.testFirebirdConnection)(dbPath).catch(err => {
            if (err instanceof Error && err.message === 'FIREBIRD_SERVER_UNAVAILABLE') {
                throw new https_1.HttpsError('unavailable', importErrors_1.FIREBIRD_UNAVAILABLE_MESSAGE);
            }
            throw err;
        });
        if (!canConnect) {
            throw new https_1.HttpsError('failed-precondition', importErrors_1.EFT_READ_ERROR_MESSAGE);
        }
        const data = await (0, firebirdClient_1.readEasyfattDatabase)(dbPath);
        const writer = new batchWriter_1.AdminBatchWriter();
        const result = await (0, documentRepair_1.repairDocumentsFromExtract)(data, existingDocs, clientIndex, supplierIndex, writer);
        try {
            await file.delete();
        }
        catch {
            /* ignore */
        }
        return result;
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
exports.repairDaneaDocuments = (0, https_1.onCall)({
    ...callableOptions_1.europeWest1Callable,
    timeoutSeconds: 540,
    memory: '512MiB',
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const { studioId, storagePath } = request.data ?? {};
    if (!studioId) {
        throw new https_1.HttpsError('invalid-argument', 'studioId obbligatorio.');
    }
    await (0, auth_1.assertStudioAccess)(request.auth.uid, studioId);
    const [existingDocs, clientIndex, supplierIndex] = await Promise.all([
        loadStudioDocuments(studioId),
        (0, importRunner_1.loadClientDupIndex)(studioId),
        (0, importRunner_1.loadSupplierDupIndex)(studioId),
    ]);
    const writer = new batchWriter_1.AdminBatchWriter();
    const heuristicResult = await (0, documentRepair_1.repairDocumentsInFirestore)(existingDocs, clientIndex, supplierIndex, writer);
    let archiveResult = {
        subjectsLinked: 0,
        documentLinks: 0,
        statusesUpdated: 0,
        documentsUpdated: 0,
        errors: [],
    };
    if (storagePath) {
        archiveResult = await repairFromArchive(studioId, storagePath, existingDocs, clientIndex, supplierIndex);
    }
    const result = {
        subjectsLinked: heuristicResult.subjectsLinked + archiveResult.subjectsLinked,
        documentLinks: heuristicResult.documentLinks + archiveResult.documentLinks,
        statusesUpdated: heuristicResult.statusesUpdated + archiveResult.statusesUpdated,
        documentsUpdated: heuristicResult.documentsUpdated + archiveResult.documentsUpdated,
        errors: [...heuristicResult.errors, ...archiveResult.errors].slice(0, 20),
    };
    return {
        message: formatRepairMessage(result, Boolean(storagePath)),
        result,
    };
});
function formatRepairMessage(result, usedArchive) {
    const parts = [];
    if (result.subjectsLinked)
        parts.push(`${result.subjectsLinked} clienti/fornitori collegati`);
    if (result.documentLinks)
        parts.push(`${result.documentLinks} collegamenti documento creati`);
    if (result.statusesUpdated)
        parts.push(`${result.statusesUpdated} stati aggiornati`);
    if (!parts.length) {
        return usedArchive
            ? 'Riparazione completata. Nessuna modifica necessaria.'
            : 'Riparazione automatica completata. Per collegamenti precisi al 100%, carica anche il file .eft Danea.';
    }
    return `Riparazione completata: ${parts.join(', ')}.`;
}
//# sourceMappingURL=repairDaneaDocuments.js.map