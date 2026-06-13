"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.revertStockMovement = exports.commitStockMovement = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./auth");
const stock_1 = require("./stock");
const db = (0, firestore_1.getFirestore)('fixlab');
function toMovementQuantities(req) {
    const qty = req.quantity ?? 0;
    switch (req.type) {
        case 'load':
            return { type: 'load', loaded: qty };
        case 'unload':
            return { type: 'unload', unloaded: qty };
        case 'committed':
            return { type: 'committed', committed: qty };
        case 'incoming':
            return { type: 'incoming', incoming: qty };
        case 'adjust':
            if (req.adjustMode === 'absolute' || req.adjustTo != null) {
                return { type: 'adjust', adjustTo: req.adjustTo ?? qty };
            }
            return { type: 'adjust', adjustDelta: qty };
        default:
            throw new https_1.HttpsError('invalid-argument', 'Tipo movimento non valido.');
    }
}
exports.commitStockMovement = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const data = request.data;
    const m = data?.movement;
    if (!m?.studioId || !m.productId || !m.type) {
        throw new https_1.HttpsError('invalid-argument', 'Payload movimento non valido.');
    }
    await (0, auth_1.assertStudioAccess)(request.auth.uid, m.studioId);
    const allowNegative = await (0, stock_1.getStudioAllowNegative)(db, m.studioId);
    const quantities = toMovementQuantities(m);
    let movementId = '';
    let previousStock = 0;
    let newStock = 0;
    let stockUpdated = false;
    await db.runTransaction(async (tx) => {
        const productRef = db.collection('products').doc(m.productId);
        const productSnap = await tx.get(productRef);
        if (!productSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Prodotto non trovato.');
        }
        const product = productSnap.data();
        if (product.studioId !== m.studioId) {
            throw new https_1.HttpsError('permission-denied', 'Prodotto non appartiene allo studio.');
        }
        const result = (0, stock_1.applyStockDelta)(tx, productRef, product, quantities, { allowNegative });
        previousStock = result.previousStock;
        newStock = result.newStock;
        stockUpdated = result.changed;
        const movementRef = db.collection('stockMovements').doc();
        movementId = movementRef.id;
        tx.set(movementRef, {
            studioId: m.studioId,
            date: m.date,
            productId: m.productId,
            productCode: m.productCode || product.code || '',
            productName: m.productName || product.name || '',
            subjectType: m.subjectType || null,
            subjectId: m.subjectId || null,
            subjectName: m.subjectName || null,
            type: m.type,
            ...(0, stock_1.buildMovementFields)(quantities),
            previousStock: result.changed ? previousStock : undefined,
            cause: m.cause || null,
            notes: m.notes || null,
            linkedDocumentId: m.linkedDocumentId || null,
            linkedDocumentType: m.linkedDocumentType || null,
            operatorId: m.operatorId || request.auth.uid,
            operatorName: m.operatorName || null,
            stockUpdated,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    return { movementId, previousStock, newStock, stockUpdated };
});
exports.revertStockMovement = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const { movementId, studioId } = request.data;
    if (!movementId || !studioId) {
        throw new https_1.HttpsError('invalid-argument', 'movementId e studioId richiesti.');
    }
    await (0, auth_1.assertStudioAccess)(request.auth.uid, studioId);
    const allowNegative = await (0, stock_1.getStudioAllowNegative)(db, studioId);
    await db.runTransaction(async (tx) => {
        const movementRef = db.collection('stockMovements').doc(movementId);
        const movementSnap = await tx.get(movementRef);
        if (!movementSnap.exists) {
            throw new https_1.HttpsError('not-found', 'Movimento non trovato.');
        }
        const movement = movementSnap.data();
        if (movement.studioId !== studioId) {
            throw new https_1.HttpsError('permission-denied', 'Movimento non appartiene allo studio.');
        }
        if (movement.linkedDocumentId) {
            throw new https_1.HttpsError('failed-precondition', 'Movimento collegato a un documento: elimina o storna dal documento.');
        }
        if (movement.stockUpdated !== false) {
            const productRef = db.collection('products').doc(movement.productId);
            const productSnap = await tx.get(productRef);
            if (productSnap.exists) {
                (0, stock_1.revertStockDelta)(tx, productRef, productSnap.data(), {
                    type: movement.type,
                    loaded: movement.loaded,
                    unloaded: movement.unloaded,
                    adjustTo: movement.adjustTo,
                    adjustDelta: movement.adjustDelta,
                    previousStock: movement.previousStock,
                }, { allowNegative });
            }
        }
        tx.delete(movementRef);
    });
    return { ok: true };
});
//# sourceMappingURL=commitStockMovement.js.map