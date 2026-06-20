"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateStudioSubscription = exports.extendSubscription = exports.getAllStudios = exports.deleteStudioComplete = exports.impersonateUser = exports.setSuperAdmin = void 0;
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const db = (0, firestore_1.getFirestore)('fixlab');
const SUPER_ADMIN_EMAILS = ['studio@gmail.com', 'samuelelazzaro78@gmail.com'];
function isSuperAdminEmail(email) {
    if (!email)
        return false;
    const normalized = email.toLowerCase();
    return SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === normalized);
}
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
    'agents',
    'warehouses',
    'priceLists',
];
const COUNT_COLLECTIONS = ['products', 'clients', 'documents', 'repairs', 'suppliers', 'payments'];
function assertSuperAdmin(request) {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    if (request.auth.token?.superAdmin === true) {
        return request.auth.uid;
    }
    const email = request.auth.token?.email;
    if (typeof email === 'string' && isSuperAdminEmail(email)) {
        return request.auth.uid;
    }
    throw new https_1.HttpsError('permission-denied', 'Solo il Super Admin può eseguire questa operazione.');
}
function formatDateYmd(d) {
    return d.toISOString().slice(0, 10);
}
function addMonthsYmd(ymd, months) {
    const [y, m, day] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1 + months, day));
    return formatDateYmd(dt);
}
function resolveOwnerId(studioData, studioId) {
    const ownerId = studioData.ownerId;
    return ownerId || studioId;
}
async function deleteCollectionByStudioId(collectionName, studioId) {
    let deleted = 0;
    const col = db.collection(collectionName);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const snap = await col.where('studioId', '==', studioId).limit(400).get();
        if (snap.empty)
            break;
        const batch = db.batch();
        snap.docs.forEach(docSnap => {
            batch.delete(docSnap.ref);
            deleted += 1;
        });
        await batch.commit();
    }
    return deleted;
}
async function deleteStorageFolder(studioId) {
    const bucket = (0, storage_1.getStorage)().bucket();
    const prefix = `studios/${studioId}/`;
    const [files] = await bucket.getFiles({ prefix });
    if (files.length === 0)
        return 0;
    await Promise.all(files.map(file => file.delete().catch(() => undefined)));
    return files.length;
}
async function deleteMembershipsForStudio(studioId) {
    let deleted = 0;
    const snap = await db.collection('memberships').where('studioId', '==', studioId).get();
    if (snap.empty)
        return 0;
    const batch = db.batch();
    snap.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
        deleted += 1;
    });
    await batch.commit();
    return deleted;
}
async function countByStudio(collectionName, studioId) {
    const snap = await db.collection(collectionName).where('studioId', '==', studioId).count().get();
    return snap.data().count;
}
/** Imposta custom claim superAdmin sull'utente autenticato (email autorizzata). */
exports.setSuperAdmin = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const caller = await (0, auth_1.getAuth)().getUser(request.auth.uid);
    if (!isSuperAdminEmail(caller.email) && caller.customClaims?.superAdmin !== true) {
        throw new https_1.HttpsError('permission-denied', 'Account non autorizzato come Super Admin.');
    }
    const existing = (caller.customClaims ?? {});
    await (0, auth_1.getAuth)().setCustomUserClaims(caller.uid, { ...existing, superAdmin: true });
    return { success: true, uid: caller.uid, email: caller.email ?? '' };
});
/** Genera custom token per impersonare un utente (solo superAdmin). */
exports.impersonateUser = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    assertSuperAdmin(request);
    const { targetUid } = request.data;
    if (!targetUid || typeof targetUid !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'targetUid obbligatorio.');
    }
    const targetUser = await (0, auth_1.getAuth)().getUser(targetUid).catch(() => null);
    if (!targetUser) {
        throw new https_1.HttpsError('not-found', 'Utente target non trovato.');
    }
    const token = await (0, auth_1.getAuth)().createCustomToken(targetUid, { impersonatedBy: request.auth.uid });
    return { token, targetUid, targetEmail: targetUser.email ?? '' };
});
/** Elimina studio completo: Firestore tenant + Storage + Auth + memberships. */
exports.deleteStudioComplete = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    assertSuperAdmin(request);
    const { studioId, confirmText } = request.data;
    if (!studioId || typeof studioId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'studioId obbligatorio.');
    }
    if (confirmText !== 'ELIMINA') {
        throw new https_1.HttpsError('failed-precondition', 'Conferma non valida: scrivi ELIMINA.');
    }
    const studioRef = db.collection('studios').doc(studioId);
    const studioSnap = await studioRef.get();
    if (!studioSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Studio non trovato.');
    }
    const studioData = studioSnap.data();
    const ownerUid = resolveOwnerId(studioData, studioId);
    const deletedCounts = {};
    for (const name of TENANT_COLLECTIONS) {
        deletedCounts[name] = await deleteCollectionByStudioId(name, studioId);
    }
    deletedCounts.memberships = await deleteMembershipsForStudio(studioId);
    deletedCounts.adminNotes = await deleteCollectionByStudioId('adminNotes', studioId);
    deletedCounts.storageFiles = await deleteStorageFolder(studioId);
    await studioRef.delete();
    const userRef = db.collection('users').doc(ownerUid);
    const userSnap = await userRef.get();
    let authUserDeleted = 0;
    if (userSnap.exists) {
        const profile = userSnap.data();
        const remainingMemberships = (profile.memberships ?? []).filter(m => m.studioId !== studioId);
        const isPrimaryStudio = profile.studioId === studioId;
        const hasOtherStudios = remainingMemberships.length > 0;
        if (isPrimaryStudio && !hasOtherStudios) {
            await userRef.delete();
            try {
                await (0, auth_1.getAuth)().deleteUser(ownerUid);
                authUserDeleted = 1;
            }
            catch {
                authUserDeleted = 0;
            }
        }
        else if (hasOtherStudios || !isPrimaryStudio) {
            await userRef.update({ memberships: remainingMemberships });
        }
        else if (isPrimaryStudio) {
            await userRef.delete();
            try {
                await (0, auth_1.getAuth)().deleteUser(ownerUid);
                authUserDeleted = 1;
            }
            catch {
                authUserDeleted = 0;
            }
        }
    }
    else {
        try {
            await (0, auth_1.getAuth)().deleteUser(ownerUid);
            authUserDeleted = 1;
        }
        catch {
            authUserDeleted = 0;
        }
    }
    deletedCounts.authUser = authUserDeleted;
    return { success: true, studioId, deletedCounts };
});
/** Elenco studi con conteggi aggregati (solo superAdmin). */
exports.getAllStudios = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    assertSuperAdmin(request);
    const studiosSnap = await db.collection('studios').get();
    const studios = [];
    for (const docSnap of studiosSnap.docs) {
        const data = docSnap.data();
        const studioId = docSnap.id;
        const counts = {
            products: 0,
            clients: 0,
            documents: 0,
            repairs: 0,
            suppliers: 0,
            payments: 0,
        };
        await Promise.all(COUNT_COLLECTIONS.map(async (name) => {
            counts[name] = await countByStudio(name, studioId);
        }));
        const createdAtRaw = data.createdAt;
        const lastLoginRaw = data.lastLoginAt;
        studios.push({
            id: studioId,
            name: String(data.name ?? ''),
            email: String(data.email ?? ''),
            ownerId: resolveOwnerId(data, studioId),
            subscription: data.subscription,
            isActive: data.isActive,
            createdAt: createdAtRaw?.toDate?.()?.toISOString?.() ?? null,
            lastLoginAt: lastLoginRaw?.toDate?.()?.toISOString?.() ?? null,
            counts,
        });
    }
    studios.sort((a, b) => a.name.localeCompare(b.name, 'it'));
    return { studios, total: studios.length };
});
/** Estende abbonamento studio (solo superAdmin). */
exports.extendSubscription = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    assertSuperAdmin(request);
    const { studioId, months, paymentAmount, paymentMethod, plan, status, } = request.data;
    if (!studioId || typeof studioId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'studioId obbligatorio.');
    }
    if (!months || typeof months !== 'number' || months < 1 || months > 36) {
        throw new https_1.HttpsError('invalid-argument', 'months deve essere tra 1 e 36.');
    }
    const studioRef = db.collection('studios').doc(studioId);
    const studioSnap = await studioRef.get();
    if (!studioSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Studio non trovato.');
    }
    const data = studioSnap.data();
    const today = formatDateYmd(new Date());
    const current = data.subscription ?? {
        plan: 'starter',
        status: 'active',
        startDate: today,
        expiryDate: today,
        paymentFrequency: 'yearly',
        monthlyPrice: 19,
        yearlyPrice: 200,
        autoRenew: false,
    };
    const baseDate = current.expiryDate && current.expiryDate >= today ? current.expiryDate : today;
    const newExpiry = addMonthsYmd(baseDate, months);
    const nextSubscription = {
        ...current,
        plan: plan ?? (current.plan === 'trial' ? 'starter' : current.plan),
        status: status ?? 'active',
        expiryDate: newExpiry,
        lastPaymentDate: today,
        lastPaymentAmount: typeof paymentAmount === 'number' ? paymentAmount : current.lastPaymentAmount,
        paymentMethod: paymentMethod ?? current.paymentMethod,
    };
    await studioRef.update({
        subscription: nextSubscription,
        isActive: true,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    await db.collection('subscriptionPayments').add({
        studioId,
        studioName: String(data.name ?? ''),
        amount: paymentAmount ?? 0,
        paymentMethod: paymentMethod ?? 'altro',
        months,
        paidAt: today,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, subscription: nextSubscription };
});
/** Aggiorna subscription (sospendi, riattiva, cambia piano) — solo superAdmin. */
exports.updateStudioSubscription = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    assertSuperAdmin(request);
    const { studioId, patch } = request.data;
    if (!studioId || !patch || typeof patch !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'studioId e patch obbligatori.');
    }
    const studioRef = db.collection('studios').doc(studioId);
    const studioSnap = await studioRef.get();
    if (!studioSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Studio non trovato.');
    }
    const data = studioSnap.data();
    const current = data.subscription ?? {
        plan: 'trial',
        status: 'trial',
        startDate: formatDateYmd(new Date()),
        expiryDate: formatDateYmd(new Date()),
        paymentFrequency: 'yearly',
        monthlyPrice: 19,
        yearlyPrice: 200,
        autoRenew: false,
    };
    const nextSubscription = { ...current, ...patch };
    const today = formatDateYmd(new Date());
    const isActive = nextSubscription.status !== 'suspended' &&
        nextSubscription.status !== 'expired' &&
        nextSubscription.expiryDate >= today;
    await studioRef.update({
        subscription: nextSubscription,
        isActive,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true, subscription: nextSubscription, isActive };
});
//# sourceMappingURL=admin.js.map