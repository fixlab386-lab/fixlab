"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertStudioAccess = assertStudioAccess;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const db = (0, firestore_1.getFirestore)('fixlab');
function membershipDocId(uid, studioId) {
    return `${uid}_${studioId}`;
}
/**

 * Verifica che l'utente possa operare sullo studioId richiesto.

 * Fase 2: membership memberships/{uid}_{studioId}.

 * Retrocompat: users/{uid}.studioId (archivio primario legacy).

 */
async function assertStudioAccess(uid, studioId) {
    const membershipSnap = await db.collection('memberships').doc(membershipDocId(uid, studioId)).get();
    if (membershipSnap.exists) {
        return;
    }
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError('permission-denied', 'Profilo utente non trovato.');
    }
    const profile = userSnap.data();
    if (profile.studioId === studioId) {
        return;
    }
    throw new https_1.HttpsError('permission-denied', 'Non autorizzato per questo studio.');
}
//# sourceMappingURL=auth.js.map