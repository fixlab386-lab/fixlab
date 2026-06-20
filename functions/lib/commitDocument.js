"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commitDocument = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./auth");
const stock_1 = require("./stock");
const db = (0, firestore_1.getFirestore)('fixlab');
const STOCK_DEDUCT_TYPES = new Set(['vendita_banco', 'ddt']);
const COMMITTABLE_STATUSES = new Set(['confirmed', 'sent', 'completed']);
function documentYearFromDate(date) {
    const y = parseInt(date.slice(0, 4), 10);
    return Number.isNaN(y) ? new Date().getFullYear() : y;
}
function buildFullNumber(number, year, numbering) {
    if (numbering?.trim())
        return `${number}/${numbering.trim()}`;
    return `${number}/${year}`;
}
function counterDocId(studioId, type, year) {
    return `${studioId}_${type}_${year}`;
}
function shouldDeductStock(type, status, stockCommitted) {
    return STOCK_DEDUCT_TYPES.has(type) && COMMITTABLE_STATUSES.has(status) && !stockCommitted;
}
function typeLabel(type) {
    const labels = {
        preventivo: 'Preventivo',
        vendita_banco: 'Ricevuta',
        ddt: 'DDT',
    };
    return labels[type] || type;
}
function stripUndefined(value) {
    if (Array.isArray(value)) {
        return value.map(item => item !== null && typeof item === 'object' ? stripUndefined(item) : item);
    }
    if (value === null || typeof value !== 'object') {
        return value;
    }
    const out = {};
    for (const [key, val] of Object.entries(value)) {
        if (val === undefined)
            continue;
        out[key] = stripUndefined(val);
    }
    return out;
}
exports.commitDocument = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    try {
        return await commitDocumentHandler(request);
    }
    catch (err) {
        if (err instanceof https_1.HttpsError)
            throw err;
        console.error('commitDocument unexpected error', err);
        const detail = err instanceof Error ? err.message : String(err);
        throw new https_1.HttpsError('internal', detail || 'Errore commit documento.');
    }
});
async function commitDocumentHandler(request) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const data = request.data;
    if (!data?.document?.studioId) {
        throw new https_1.HttpsError('invalid-argument', 'Payload documento non valido.');
    }
    const { documentId, document, assignNumber = !documentId } = data;
    await (0, auth_1.assertStudioAccess)(request.auth.uid, document.studioId);
    const allowNegative = await db.collection('studios').doc(document.studioId).get().then(s => Boolean(s.data()?.allowNegativeStock));
    const year = document.documentYear ?? documentYearFromDate(document.date);
    const counterRef = db.collection('documentCounters').doc(counterDocId(document.studioId, document.type, year));
    let resultDocId = documentId || '';
    let assignedNumber = document.number || 0;
    let assignedFullNumber = document.fullNumber || '';
    let stockCommitted = Boolean(document.stockCommitted);
    const stockWarning = undefined;
    await db.runTransaction(async (tx) => {
        const docRef = documentId ? db.collection('documents').doc(documentId) : db.collection('documents').doc();
        // --- Fase letture (Firestore: tutte le read prima delle write) ---
        let existingStockCommitted = false;
        if (documentId) {
            const existingSnap = await tx.get(docRef);
            if (!existingSnap.exists) {
                throw new https_1.HttpsError('not-found', 'Documento non trovato.');
            }
            existingStockCommitted = Boolean(existingSnap.data().stockCommitted);
            resultDocId = documentId;
        }
        else {
            resultDocId = docRef.id;
        }
        let counterLast = 0;
        if (assignNumber) {
            const counterSnap = await tx.get(counterRef);
            counterLast = counterSnap.exists ? Number(counterSnap.data()?.lastNumber || 0) : 0;
        }
        const nextStockCommitted = existingStockCommitted || stockCommitted;
        const deduct = shouldDeductStock(document.type, document.status, nextStockCommitted);
        const stockRows = deduct ? (document.rows || []).filter(r => r.productId && r.quantity > 0) : [];
        const productReads = [];
        for (const row of stockRows) {
            const productRef = db.collection('products').doc(row.productId);
            const productSnap = await tx.get(productRef);
            if (!productSnap.exists)
                continue;
            const product = productSnap.data();
            if (product.studioId !== document.studioId)
                continue;
            productReads.push({ row, productRef, product });
        }
        // --- Calcolo numerazione e payload ---
        if (assignNumber) {
            assignedNumber = counterLast + 1;
            assignedFullNumber = buildFullNumber(assignedNumber, year, document.numbering);
        }
        else {
            assignedNumber = document.number || assignedNumber;
            assignedFullNumber = document.fullNumber || buildFullNumber(assignedNumber, year, document.numbering);
        }
        const savePayload = {
            ...stripUndefined(document),
            number: assignedNumber,
            fullNumber: assignedFullNumber,
            documentYear: year,
            stockCommitted: nextStockCommitted,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        if (!documentId) {
            savePayload.createdAt = firestore_1.FieldValue.serverTimestamp();
        }
        // --- Fase scritture ---
        if (assignNumber) {
            tx.set(counterRef, { lastNumber: assignedNumber, studioId: document.studioId, type: document.type, year, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        }
        if (deduct) {
            for (const { row, productRef, product } of productReads) {
                (0, stock_1.applyStockDelta)(tx, productRef, product, { type: 'unload', unloaded: row.quantity }, { allowNegative, requireWithStock: true });
                const movementRef = db.collection('stockMovements').doc();
                const cause = `${typeLabel(document.type)} ${assignedFullNumber} del ${document.date}`;
                tx.set(movementRef, stripUndefined({
                    studioId: document.studioId,
                    date: document.date,
                    productId: row.productId,
                    productCode: row.productCode || product.code || '',
                    productName: row.description || product.name || '',
                    subjectType: document.subjectType,
                    subjectId: document.subjectId || null,
                    subjectName: document.subjectName,
                    type: 'unload',
                    ...(0, stock_1.buildMovementFields)({ type: 'unload', unloaded: row.quantity }),
                    cause,
                    linkedDocumentId: resultDocId,
                    linkedDocumentType: document.type,
                    operatorId: request.auth.uid,
                    createdAt: firestore_1.FieldValue.serverTimestamp(),
                }));
            }
            savePayload.stockCommitted = true;
            stockCommitted = true;
        }
        if (documentId) {
            tx.set(docRef, savePayload, { merge: true });
        }
        else {
            tx.set(docRef, savePayload);
        }
    });
    return {
        documentId: resultDocId,
        number: assignedNumber,
        fullNumber: assignedFullNumber,
        documentYear: year,
        stockCommitted,
        stockWarning,
    };
}
//# sourceMappingURL=commitDocument.js.map