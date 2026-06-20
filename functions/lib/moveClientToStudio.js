"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIRM_TEXT = exports.MAX_TRANSACTION_OPS = exports.moveClientToStudio = void 0;
exports.collectClientBundle = collectClientBundle;
exports.buildCounts = buildCounts;
exports.isClientSubject = isClientSubject;
exports.collectClientDocuments = collectClientDocuments;
exports.collectClientPayments = collectClientPayments;
/**
 * Sposta un cliente e tutto il suo storico da un archivio a un altro (Admin SDK).
 * Il client non può cambiare studioId (tenantStudioIdUnchanged nelle Firestore rules).
 */
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("./auth");
const db = (0, firestore_1.getFirestore)('fixlab');
/** Firestore: max 500 operazioni per transazione (letture + scritture). */
const MAX_TRANSACTION_OPS = 450;
exports.MAX_TRANSACTION_OPS = MAX_TRANSACTION_OPS;
const CONFIRM_TEXT = 'SPOSTA CLIENTE';
exports.CONFIRM_TEXT = CONFIRM_TEXT;
function isClientSubject(data, clientId) {
    return data.subjectType === 'client' && data.subjectId === clientId;
}
/**
 * Documenti/pagamenti in FIXLab usano subjectType + subjectId (mai clientId diretto).
 * Vedi NuovoDocumento, Cassa, commitDocument. Includiamo anche:
 * - documenti collegati (linkedDocumentId) nella chiusura del grafo
 * - pagamenti collegati a documenti spostati anche senza subjectId
 */
function collectClientDocuments(clientId, documentsSnap) {
    const byId = new Map(documentsSnap.map(s => [s.id, s]));
    const selected = new Set();
    for (const snap of documentsSnap) {
        const data = snap.data();
        if (!data)
            continue;
        if (isClientSubject(data, clientId)) {
            selected.add(snap.id);
        }
    }
    let expanded = true;
    while (expanded) {
        expanded = false;
        for (const snap of documentsSnap) {
            if (selected.has(snap.id))
                continue;
            const data = snap.data();
            if (!data)
                continue;
            const linked = data.linkedDocumentId;
            if (linked && selected.has(linked)) {
                selected.add(snap.id);
                expanded = true;
            }
        }
    }
    return Array.from(selected)
        .map(id => byId.get(id))
        .filter((snap) => !!snap)
        .map(snap => snap.ref);
}
function collectClientPayments(clientId, movedDocumentIds, paymentsSnap) {
    const selected = new Map();
    for (const snap of paymentsSnap) {
        const data = snap.data();
        if (!data)
            continue;
        if (isClientSubject(data, clientId)) {
            selected.set(snap.id, snap.ref);
            continue;
        }
        const linked = data.linkedDocumentId;
        if (linked && movedDocumentIds.has(linked)) {
            selected.set(snap.id, snap.ref);
        }
    }
    return Array.from(selected.values());
}
async function allocateClientCode(tx, targetStudioId) {
    const q = db.collection('clients').where('studioId', '==', targetStudioId).orderBy('code', 'desc').limit(1);
    const snap = await tx.get(q);
    if (snap.empty)
        return '0001';
    const lastCode = String(snap.docs[0].data().code ?? '0000');
    const next = Number(lastCode);
    if (!Number.isFinite(next))
        return '0001';
    return String(next + 1).padStart(4, '0');
}
async function collectClientBundle(clientId, sourceStudioId) {
    const clientRef = db.collection('clients').doc(clientId);
    const clientSnap = await clientRef.get();
    if (!clientSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Cliente non trovato.');
    }
    const clientData = clientSnap.data();
    if (clientData.studioId !== sourceStudioId) {
        throw new https_1.HttpsError('failed-precondition', 'Il cliente non appartiene all\'archivio di origine indicato.');
    }
    const [repairsSnap, devicesSnap, subjectDocsSnap, subjectPaymentsSnap, stockSnap] = await Promise.all([
        db.collection('repairs').where('studioId', '==', sourceStudioId).where('clientId', '==', clientId).get(),
        db.collection('devices').where('studioId', '==', sourceStudioId).where('clientId', '==', clientId).get(),
        db
            .collection('documents')
            .where('studioId', '==', sourceStudioId)
            .where('subjectId', '==', clientId)
            .where('subjectType', '==', 'client')
            .limit(500)
            .get(),
        db
            .collection('payments')
            .where('studioId', '==', sourceStudioId)
            .where('subjectId', '==', clientId)
            .where('subjectType', '==', 'client')
            .limit(500)
            .get(),
        db
            .collection('stockMovements')
            .where('studioId', '==', sourceStudioId)
            .where('subjectId', '==', clientId)
            .where('subjectType', '==', 'client')
            .limit(500)
            .get(),
    ]);
    const repairs = repairsSnap.docs;
    const devices = devicesSnap.docs;
    const selectedDocIds = new Set();
    for (const snap of subjectDocsSnap.docs) {
        selectedDocIds.add(snap.id);
    }
    let expanded = true;
    while (expanded) {
        expanded = false;
        for (const id of [...selectedDocIds]) {
            const snap = await db.collection('documents').doc(id).get();
            const linked = snap.data()?.linkedDocumentId;
            if (linked && !selectedDocIds.has(linked)) {
                selectedDocIds.add(linked);
                expanded = true;
            }
        }
    }
    const documents = Array.from(selectedDocIds).map(id => db.collection('documents').doc(id));
    const movedDocumentIds = selectedDocIds;
    const paymentRefs = new Map();
    for (const snap of subjectPaymentsSnap.docs) {
        paymentRefs.set(snap.id, snap.ref);
    }
    const docIdList = Array.from(movedDocumentIds);
    for (let i = 0; i < docIdList.length; i += 10) {
        const chunk = docIdList.slice(i, i + 10);
        if (chunk.length === 0)
            continue;
        const linkedPaySnap = await db
            .collection('payments')
            .where('studioId', '==', sourceStudioId)
            .where('linkedDocumentId', 'in', chunk)
            .get();
        for (const snap of linkedPaySnap.docs) {
            paymentRefs.set(snap.id, snap.ref);
        }
    }
    const payments = Array.from(paymentRefs.values());
    const stockMovementsStaying = stockSnap.docs.map(d => d.ref);
    let repairPhotoCount = 0;
    const repairPhotoPaths = [];
    for (const repair of repairs) {
        const photos = repair.data().photos;
        if (!photos?.length)
            continue;
        repairPhotoCount += photos.length;
        repairPhotoPaths.push({ repairId: repair.id, photos });
    }
    return {
        clientRef,
        clientName: String(clientData.name ?? clientId),
        repairs: repairs.map(d => d.ref),
        devices: devices.map(d => d.ref),
        documents,
        payments,
        stockMovementsStaying,
        repairPhotoCount,
        repairPhotoPaths,
    };
}
function buildCounts(bundle) {
    return {
        repairs: bundle.repairs.length,
        devices: bundle.devices.length,
        documents: bundle.documents.length,
        payments: bundle.payments.length,
        repairPhotos: bundle.repairPhotoCount,
        stockMovementsStayingInSource: bundle.stockMovementsStaying.length,
    };
}
function estimateTransactionOps(bundle) {
    const docsToMove = 1 + bundle.repairs.length + bundle.devices.length + bundle.documents.length + bundle.payments.length;
    return docsToMove * 2 + 2;
}
function buildDownloadUrl(bucketName, storagePath, token) {
    const encoded = encodeURIComponent(storagePath);
    if (token) {
        return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media&token=${token}`;
    }
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encoded}?alt=media`;
}
async function cleanupCopiedPhotos(paths) {
    if (!paths.length)
        return;
    const bucket = (0, storage_1.getStorage)().bucket();
    await Promise.all(paths.map(path => bucket.file(path).delete({ ignoreNotFound: true })));
}
async function deleteSourceRepairPhotos(paths) {
    await cleanupCopiedPhotos(paths);
}
/**
 * Copia TUTTE le foto in destinazione prima della transazione Firestore.
 * Se una copia fallisce, abortisce e ripulisce le copie parziali.
 */
async function copyRepairPhotosToDestination(bundle, sourceStudioId, targetStudioId) {
    if (!bundle.repairPhotoPaths.length) {
        return {
            ok: true,
            prepared: {
                urlByRepairId: new Map(),
                copiedDestPaths: [],
                sourcePathsToDelete: [],
            },
        };
    }
    const bucket = (0, storage_1.getStorage)().bucket();
    const bucketName = bucket.name;
    const errors = [];
    const copiedDestPaths = [];
    const sourcePathsToDelete = [];
    const urlByRepairId = new Map();
    for (const entry of bundle.repairPhotoPaths) {
        const updatedPhotos = [];
        for (const photo of entry.photos) {
            const newPath = photo.path.replace(`studios/${sourceStudioId}/`, `studios/${targetStudioId}/`);
            try {
                const srcFile = bucket.file(photo.path);
                const [exists] = await srcFile.exists();
                if (!exists) {
                    errors.push(`Foto assente in Storage: ${photo.path}`);
                    continue;
                }
                const destFile = bucket.file(newPath);
                const [destExists] = await destFile.exists();
                if (destExists) {
                    errors.push(`Destinazione già occupata: ${newPath}`);
                    continue;
                }
                await srcFile.copy(destFile);
                copiedDestPaths.push(newPath);
                sourcePathsToDelete.push(photo.path);
                const [meta] = await destFile.getMetadata();
                const token = meta.metadata?.firebaseStorageDownloadTokens;
                updatedPhotos.push({
                    ...photo,
                    path: newPath,
                    url: buildDownloadUrl(bucketName, newPath, token),
                });
            }
            catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`Errore copia foto ${photo.path}: ${msg}`);
            }
        }
        urlByRepairId.set(entry.repairId, updatedPhotos);
    }
    if (errors.length > 0) {
        await cleanupCopiedPhotos(copiedDestPaths);
        return { ok: false, errors, copiedDestPaths: [] };
    }
    return {
        ok: true,
        prepared: {
            urlByRepairId,
            copiedDestPaths,
            sourcePathsToDelete,
        },
    };
}
async function writeTransferAuditLog(params) {
    const ref = db.collection('clientTransfers').doc();
    await ref.set({
        clientId: params.clientId,
        clientName: params.clientName,
        sourceStudioId: params.sourceStudioId,
        targetStudioId: params.targetStudioId,
        movedBy: params.movedBy,
        newClientCode: params.newClientCode,
        report: {
            ...params.counts,
            repairPhotosMigrated: params.repairPhotosMigrated,
            repairPhotoErrors: [],
        },
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return ref.id;
}
async function executeClientMove(params) {
    const bundle = await collectClientBundle(params.clientId, params.sourceStudioId);
    const counts = buildCounts(bundle);
    const txOps = estimateTransactionOps(bundle);
    if (txOps > MAX_TRANSACTION_OPS) {
        throw new https_1.HttpsError('failed-precondition', `Cliente con troppi collegamenti (${txOps} operazioni stimate, limite ${MAX_TRANSACTION_OPS}). ` +
            `Riparazioni: ${counts.repairs}, documenti: ${counts.documents}, pagamenti: ${counts.payments}, dispositivi: ${counts.devices}. ` +
            'Contatta il supporto FIXLab per uno spostamento assistito.');
    }
    const photoCopy = await copyRepairPhotosToDestination(bundle, params.sourceStudioId, params.targetStudioId);
    if (!photoCopy.ok) {
        throw new https_1.HttpsError('failed-precondition', `Copia foto non riuscita. Nessun dato Firestore modificato. Dettagli: ${photoCopy.errors.join(' | ')}`);
    }
    const preparedPhotos = photoCopy.prepared;
    let newClientCode = '';
    try {
        await db.runTransaction(async (tx) => {
            const clientSnap = await tx.get(bundle.clientRef);
            if (!clientSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Cliente non trovato.');
            }
            const clientData = clientSnap.data();
            if (clientData.studioId !== params.sourceStudioId) {
                throw new https_1.HttpsError('failed-precondition', 'Il cliente non è più nell\'archivio di origine. Ricarica e riprova.');
            }
            newClientCode = await allocateClientCode(tx, params.targetStudioId);
            const allRefs = [...bundle.repairs, ...bundle.devices, ...bundle.documents, ...bundle.payments];
            const snapshots = await Promise.all(allRefs.map(ref => tx.get(ref)));
            for (const snap of snapshots) {
                if (!snap.exists) {
                    throw new https_1.HttpsError('aborted', 'Dati collegati modificati durante lo spostamento. Nessuna modifica applicata.');
                }
                if (snap.data()?.studioId !== params.sourceStudioId) {
                    throw new https_1.HttpsError('aborted', 'Inconsistenza archivio su un documento collegato. Operazione annullata.');
                }
            }
            tx.update(bundle.clientRef, {
                studioId: params.targetStudioId,
                code: newClientCode,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            for (const repairRef of bundle.repairs) {
                const prepared = preparedPhotos.urlByRepairId.get(repairRef.id);
                const repairSnap = snapshots.find(s => s.ref.path === repairRef.path);
                const existingPhotos = repairSnap?.data()?.photos;
                tx.update(repairRef, {
                    studioId: params.targetStudioId,
                    ...(prepared?.length ? { photos: prepared } : existingPhotos?.length ? { photos: existingPhotos } : {}),
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            for (const deviceRef of bundle.devices) {
                tx.update(deviceRef, {
                    studioId: params.targetStudioId,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            for (const documentRef of bundle.documents) {
                tx.update(documentRef, {
                    studioId: params.targetStudioId,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
            for (const paymentRef of bundle.payments) {
                tx.update(paymentRef, {
                    studioId: params.targetStudioId,
                    updatedAt: firestore_1.FieldValue.serverTimestamp(),
                });
            }
        });
    }
    catch (err) {
        await cleanupCopiedPhotos(preparedPhotos.copiedDestPaths);
        throw err;
    }
    await deleteSourceRepairPhotos(preparedPhotos.sourcePathsToDelete);
    const transferLogId = await writeTransferAuditLog({
        clientId: params.clientId,
        clientName: bundle.clientName,
        sourceStudioId: params.sourceStudioId,
        targetStudioId: params.targetStudioId,
        movedBy: params.uid,
        newClientCode,
        counts,
        repairPhotosMigrated: preparedPhotos.copiedDestPaths.length,
    });
    return {
        clientName: bundle.clientName,
        newClientCode,
        counts,
        repairPhotosMigrated: preparedPhotos.copiedDestPaths.length,
        repairPhotoErrors: [],
        transferLogId,
    };
}
exports.moveClientToStudio = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const data = request.data;
    const clientId = String(data?.clientId ?? '').trim();
    const sourceStudioId = String(data?.sourceStudioId ?? '').trim();
    const targetStudioId = String(data?.targetStudioId ?? '').trim();
    const mode = data?.mode === 'execute' ? 'execute' : 'preview';
    if (!clientId || !sourceStudioId || !targetStudioId) {
        throw new https_1.HttpsError('invalid-argument', 'clientId, sourceStudioId e targetStudioId sono obbligatori.');
    }
    if (sourceStudioId === targetStudioId) {
        throw new https_1.HttpsError('invalid-argument', 'Archivio di origine e destinazione devono essere diversi.');
    }
    const uid = request.auth.uid;
    await (0, auth_1.assertStudioAccess)(uid, sourceStudioId);
    await (0, auth_1.assertStudioAccess)(uid, targetStudioId);
    if (mode === 'preview') {
        const bundle = await collectClientBundle(clientId, sourceStudioId);
        const counts = buildCounts(bundle);
        const txOps = estimateTransactionOps(bundle);
        const withinLimits = txOps <= MAX_TRANSACTION_OPS;
        return {
            mode: 'preview',
            clientId,
            clientName: bundle.clientName,
            sourceStudioId,
            targetStudioId,
            counts,
            withinLimits,
            transactionOperationsEstimate: txOps,
            limitMessage: withinLimits
                ? undefined
                : `Troppi collegamenti (${txOps} operazioni). Limite transazione: ${MAX_TRANSACTION_OPS}.`,
        };
    }
    if (data.confirmText !== CONFIRM_TEXT) {
        throw new https_1.HttpsError('invalid-argument', `Conferma non valida. Digita esattamente: ${CONFIRM_TEXT}`);
    }
    const result = await executeClientMove({ uid, clientId, sourceStudioId, targetStudioId });
    return {
        mode: 'execute',
        clientId,
        sourceStudioId,
        targetStudioId,
        ...result,
    };
});
//# sourceMappingURL=moveClientToStudio.js.map