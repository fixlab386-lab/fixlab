"use strict";
/**
 * Cloud Functions multi-archivio — PREDISPOSTE, NON ESPORTATE in index.ts.
 * Deploy solo dopo OK esplicito e test su progetto fixlab-app.
 *
 * - createStudioWithMembership: creazione atomica studio + membership owner
 * - duplicateStudioArchive: copia dati tenant (pesante; Fase 2+)
 * - deleteStudioCascade: eliminazione archivio + dati collegati (zona pericolosa)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_COLLECTIONS = exports.deleteStudioCascade = exports.duplicateStudioArchive = exports.createStudioWithMembership = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./auth");
const db = (0, firestore_1.getFirestore)('fixlab');
const TENANT_COLLECTIONS = [
    'categories',
    'products',
    'repairs',
    'clients',
    'suppliers',
    'documents',
    'payments',
    'paymentResources',
    'stockMovements',
    'devices',
];
exports.TENANT_COLLECTIONS = TENANT_COLLECTIONS;
function membershipDocId(uid, studioId) {
    return `${uid}_${studioId}`;
}
/** Crea studio con ID auto + membership owner in un'unica transazione (Admin). */
exports.createStudioWithMembership = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const uid = request.auth.uid;
    const data = request.data;
    const name = String(data?.name ?? '').trim();
    if (!name) {
        throw new https_1.HttpsError('invalid-argument', 'Nome archivio obbligatorio.');
    }
    const userSnap = await db.collection('users').doc(uid).get();
    if (!userSnap.exists) {
        throw new https_1.HttpsError('permission-denied', 'Profilo utente non trovato.');
    }
    const userEmail = String(data.email ?? userSnap.data()?.email ?? '');
    let studioId = '';
    await db.runTransaction(async (tx) => {
        const studioRef = db.collection('studios').doc();
        studioId = studioRef.id;
        const membershipRef = db.collection('memberships').doc(membershipDocId(uid, studioId));
        tx.set(studioRef, {
            name,
            email: userEmail,
            ownerId: uid,
            onboardingCompleted: false,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        tx.set(membershipRef, {
            userId: uid,
            studioId,
            role: 'owner',
            createdAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const existingMemberships = userSnap.data()?.memberships ?? [];
        const nextMemberships = [...existingMemberships, { studioId, role: 'owner' }];
        tx.update(db.collection('users').doc(uid), {
            memberships: nextMemberships,
            defaultStudioId: studioId,
        });
    });
    return { studioId };
});
/**
 * Duplica un archivio (tenant collections). Operazione costosa — da usare con limiti e job async.
 * NON deployata: richiede batching, quote Firestore e copia Storage.
 */
exports.duplicateStudioArchive = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const data = request.data;
    if (!data?.sourceStudioId || !data?.newName?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'sourceStudioId e newName richiesti.');
    }
    await (0, auth_1.assertStudioAccess)(request.auth.uid, data.sourceStudioId);
    throw new https_1.HttpsError('unimplemented', 'Duplicazione archivio non ancora implementata. Usare export/import manuale.');
});
/**
 * Elimina archivio e dati tenant (NON l'account utente).
 * NON deployata: richiede conferma forte, esclusione archivio primario, purge Storage.
 */
exports.deleteStudioCascade = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const data = request.data;
    if (!data?.studioId || data.confirmText !== 'ELIMINA ARCHIVIO') {
        throw new https_1.HttpsError('invalid-argument', 'Conferma non valida.');
    }
    const uid = request.auth.uid;
    const userSnap = await db.collection('users').doc(uid).get();
    const legacyStudioId = userSnap.data()?.studioId;
    if (data.studioId === legacyStudioId) {
        throw new https_1.HttpsError('failed-precondition', 'Non puoi eliminare l\'archivio primario da qui. Usa eliminazione account.');
    }
    await (0, auth_1.assertStudioAccess)(uid, data.studioId);
    const membershipSnap = await db.collection('memberships').doc(membershipDocId(uid, data.studioId)).get();
    if (!membershipSnap.exists || membershipSnap.data()?.role !== 'owner') {
        throw new https_1.HttpsError('permission-denied', 'Solo il proprietario può eliminare l\'archivio.');
    }
    throw new https_1.HttpsError('unimplemented', 'Delete cascade non ancora implementata. Rimuovere membership manualmente da console.');
});
//# sourceMappingURL=studioArchives.js.map