"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.movementQuantityLabel = movementQuantityLabel;
exports.computeNewStock = computeNewStock;
exports.applyStockDelta = applyStockDelta;
exports.revertStockDelta = revertStockDelta;
exports.getStudioAllowNegative = getStudioAllowNegative;
exports.buildMovementFields = buildMovementFields;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
function movementQuantityLabel(m) {
    if (m.type === 'load')
        return `+${m.loaded ?? 0}`;
    if (m.type === 'unload')
        return `−${m.unloaded ?? 0}`;
    if (m.type === 'committed')
        return `${m.committed ?? 0} imp.`;
    if (m.type === 'incoming')
        return `${m.incoming ?? 0} arr.`;
    if (m.adjustTo != null)
        return `→ ${m.adjustTo}`;
    if (m.adjustDelta != null)
        return `${m.adjustDelta >= 0 ? '+' : ''}${m.adjustDelta}`;
    return '—';
}
/** Calcola la nuova giacenza fisica senza side-effect. */
function computeNewStock(currentStock, m) {
    switch (m.type) {
        case 'load':
            return currentStock + (m.loaded ?? 0);
        case 'unload':
            return currentStock - (m.unloaded ?? 0);
        case 'adjust':
            if (m.adjustTo != null)
                return m.adjustTo;
            return currentStock + (m.adjustDelta ?? 0);
        case 'committed':
        case 'incoming':
            return null;
        default:
            return currentStock;
    }
}
/** Applica il movimento alla giacenza fisica del prodotto (non tocca impegnato/in arrivo). */
function applyStockDelta(tx, productRef, product, movement, options = {}) {
    const { allowNegative = false, requireWithStock = false } = options;
    const currentStock = product.stock ?? 0;
    if (movement.type === 'committed' || movement.type === 'incoming') {
        return { previousStock: currentStock, newStock: currentStock, changed: false };
    }
    if (requireWithStock && product.typology && product.typology !== 'with_stock') {
        return { previousStock: currentStock, newStock: currentStock, changed: false };
    }
    const computed = computeNewStock(currentStock, movement);
    if (computed === null) {
        return { previousStock: currentStock, newStock: currentStock, changed: false };
    }
    if (computed < 0 && !allowNegative) {
        throw new https_1.HttpsError('failed-precondition', `Giacenza insufficiente per ${product.name || 'prodotto'} (disp. ${currentStock}, risultato ${computed}).`);
    }
    tx.update(productRef, {
        stock: computed,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { previousStock: currentStock, newStock: computed, changed: true };
}
/** Storno di un movimento già applicato (inverso). */
function revertStockDelta(tx, productRef, product, movement, options = {}) {
    const { allowNegative = false } = options;
    const currentStock = product.stock ?? 0;
    if (movement.type === 'committed' || movement.type === 'incoming') {
        return;
    }
    let restored;
    if (movement.previousStock != null) {
        restored = movement.previousStock;
    }
    else {
        switch (movement.type) {
            case 'load':
                restored = currentStock - (movement.loaded ?? 0);
                break;
            case 'unload':
                restored = currentStock + (movement.unloaded ?? 0);
                break;
            case 'adjust':
                if (movement.previousStock != null)
                    restored = movement.previousStock;
                else
                    throw new https_1.HttpsError('failed-precondition', 'Impossibile stornare rettifica senza previousStock.');
                break;
            default:
                return;
        }
    }
    if (restored < 0 && !allowNegative) {
        throw new https_1.HttpsError('failed-precondition', `Storno impossibile: giacenza risultante negativa (${restored}).`);
    }
    tx.update(productRef, {
        stock: restored,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
}
async function getStudioAllowNegative(db, studioId) {
    const snap = await db.collection('studios').doc(studioId).get();
    return Boolean(snap.data()?.allowNegativeStock);
}
function buildMovementFields(movement) {
    return {
        loaded: movement.type === 'load' ? movement.loaded : undefined,
        unloaded: movement.type === 'unload' ? movement.unloaded : undefined,
        committed: movement.type === 'committed' ? movement.committed : undefined,
        incoming: movement.type === 'incoming' ? movement.incoming : undefined,
        adjustTo: movement.type === 'adjust' ? movement.adjustTo : undefined,
        adjustDelta: movement.type === 'adjust' ? movement.adjustDelta : undefined,
    };
}
//# sourceMappingURL=stock.js.map