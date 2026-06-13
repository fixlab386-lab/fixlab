"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMembershipClaimsSync = exports.syncStudioClaims = void 0;
exports.collectVerifiedStudioIds = collectVerifiedStudioIds;
exports.applyStudioClaimsForUser = applyStudioClaimsForUser;
/**
 * Sincronizza custom claim `studioIds` da memberships/ (database fixlab).
 * Usato dalle Storage rules — non possono leggere Firestore su DB non-default.
 */
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const firestore_2 = require("firebase-functions/v2/firestore");
const db = (0, firestore_1.getFirestore)('fixlab');
/** Firebase Auth: max ~1000 byte per l'intero payload JSON dei custom claims. */
const CLAIM_MAX_BYTES = 1000;
/** Margine per evitare edge case di serializzazione. */
const CLAIM_SAFE_BYTES = 900;
function membershipDocId(userId, studioId) {
    return `${userId}_${studioId}`;
}
function estimateClaimsPayloadBytes(studioIds) {
    const payload = { studioIds: [...studioIds].sort() };
    return Buffer.byteLength(JSON.stringify(payload), 'utf8');
}
/**
 * Legge memberships/ e costruisce studioIds SOLO da doc verificati.
 * Non accetta input dal client su quali studi includere.
 */
async function collectVerifiedStudioIds(uid) {
    const snap = await db.collection('memberships').where('userId', '==', uid).get();
    const studioIds = new Set();
    for (const doc of snap.docs) {
        const data = doc.data();
        const studioId = data.studioId;
        const docUserId = data.userId;
        if (typeof studioId !== 'string' || !studioId.trim())
            continue;
        if (docUserId !== uid)
            continue;
        if (doc.id !== membershipDocId(uid, studioId))
            continue;
        studioIds.add(studioId);
    }
    return Array.from(studioIds).sort();
}
/** Scrive { studioIds } nei custom claims dell'utente. */
async function applyStudioClaimsForUser(uid) {
    const studioIds = await collectVerifiedStudioIds(uid);
    const bytes = estimateClaimsPayloadBytes(studioIds);
    if (bytes > CLAIM_SAFE_BYTES) {
        throw new https_1.HttpsError('resource-exhausted', `Troppi archivi per i custom claims (${studioIds.length} studi, ~${bytes} byte). ` +
            `Limite sicuro ~${CLAIM_SAFE_BYTES} byte (max Firebase ${CLAIM_MAX_BYTES}). ` +
            'Contatta il supporto FIXLab.');
    }
    await (0, auth_1.getAuth)().setCustomUserClaims(uid, { studioIds });
    return { studioIds };
}
/** Callable: sincronizza i claims dell'utente autenticato (mai di un altro uid). */
exports.syncStudioClaims = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const payload = await applyStudioClaimsForUser(request.auth.uid);
    return payload;
});
/**
 * Trigger: ogni scrittura su memberships/ risincronizza i claims dell'utente interessato.
 * Rete di sicurezza per backfill admin, script, future Functions.
 */
exports.onMembershipClaimsSync = (0, firestore_2.onDocumentWritten)({
    document: 'memberships/{membershipId}',
    database: 'fixlab',
    region: 'europe-west1',
}, async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    const userId = (after?.exists ? after.data()?.userId : undefined) ??
        (before?.exists ? before.data()?.userId : undefined);
    if (!userId || typeof userId !== 'string')
        return;
    await applyStudioClaimsForUser(userId);
});
//# sourceMappingURL=syncStudioClaims.js.map