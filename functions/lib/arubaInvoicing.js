"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendArubaInvoice = exports.testArubaConnection = exports.saveArubaCredentials = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./auth");
const client_1 = require("./aruba/client");
const crypto_1 = require("./aruba/crypto");
const fatturaPaXml_1 = require("./aruba/fatturaPaXml");
const arubaSecretsKey = (0, params_1.defineSecret)('ARUBA_SECRETS_KEY');
const arubaCallables = { region: 'europe-west1', secrets: [arubaSecretsKey] };
function secretsKeyValue() {
    return arubaSecretsKey.value();
}
const db = (0, firestore_1.getFirestore)('fixlab');
const VALID_RIFERIMENTO_TIPI = new Set([
    'ordine_acquisto',
    'contratto',
    'convenzione',
    'ricezione',
    'fattura_collegata',
    'ddt',
]);
function resolveRiferimentoDocumento(raw) {
    if (!raw || typeof raw !== 'object')
        return undefined;
    const tipo = typeof raw.tipo === 'string' ? raw.tipo : '';
    if (!VALID_RIFERIMENTO_TIPI.has(tipo))
        return undefined;
    const numero = typeof raw.numero === 'string' ? raw.numero.trim() : '';
    const data = typeof raw.data === 'string' ? raw.data.trim() : '';
    const cig = typeof raw.cig === 'string' ? raw.cig.trim() : '';
    const cup = typeof raw.cup === 'string' ? raw.cup.trim() : '';
    const commessaConvenzione = typeof raw.commessaConvenzione === 'string' ? raw.commessaConvenzione.trim() : '';
    if (!numero && !data && !cig && !cup && !commessaConvenzione)
        return undefined;
    return {
        tipo: tipo,
        numero,
        data,
        cig,
        cup,
        commessaConvenzione,
    };
}
function normalizeEnvironment(value) {
    return value === 'production' ? 'production' : 'demo';
}
async function loadArubaPassword(studioId) {
    const snap = await db.collection('studioSecrets').doc(studioId).get();
    const encrypted = snap.data()?.arubaPasswordEncrypted;
    if (typeof encrypted !== 'string' || !encrypted) {
        throw new https_1.HttpsError('failed-precondition', 'Password Aruba non configurata per questo studio.');
    }
    try {
        return (0, crypto_1.decryptSecret)(encrypted, secretsKeyValue());
    }
    catch {
        throw new https_1.HttpsError('internal', 'Impossibile decifrare le credenziali Aruba.');
    }
}
async function nextProgressivoInvio(studioId) {
    const ref = db.collection('arubaCounters').doc(studioId);
    const next = await db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const current = snap.exists ? Number(snap.data()?.progressivoInvio || 0) : 0;
        const value = current + 1;
        tx.set(ref, { progressivoInvio: value, studioId, updatedAt: firestore_1.FieldValue.serverTimestamp() }, { merge: true });
        return value;
    });
    return String(next).padStart(5, '0').slice(-10);
}
function paymentModeCode(method) {
    const m = (method || '').toLowerCase();
    if (m.includes('bonif'))
        return 'MP05';
    if (m.includes('contant') || m.includes('cassa'))
        return 'MP01';
    if (m.includes('carta') || m.includes('pos'))
        return 'MP08';
    if (m.includes('assegno'))
        return 'MP02';
    return undefined;
}
function resolveCustomerDestination(client) {
    const destinationCode = typeof client.destinationCode === 'string' ? client.destinationCode.trim() : '';
    const pec = typeof client.pec === 'string' ? client.pec.trim() : '';
    if (destinationCode)
        return { codiceDestinatario: destinationCode.toUpperCase() };
    if (pec)
        return { codiceDestinatario: '0000000', pec };
    throw new https_1.HttpsError('failed-precondition', 'Cliente senza codice destinatario o PEC per la fattura elettronica.');
}
exports.saveArubaCredentials = (0, https_1.onCall)(arubaCallables, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    const { studioId, username, password, environment, enabled, regimeFiscale } = request.data;
    if (!studioId || !username?.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'Studio e username Aruba obbligatori.');
    }
    await (0, auth_1.assertStudioAccess)(request.auth.uid, studioId);
    const studioRef = db.collection('studios').doc(studioId);
    const studioSnap = await studioRef.get();
    if (!studioSnap.exists)
        throw new https_1.HttpsError('not-found', 'Studio non trovato.');
    const env = normalizeEnvironment(environment);
    const patch = {
        enabled: Boolean(enabled),
        environment: env,
        username: username.trim(),
        regimeFiscale: regimeFiscale?.trim() || 'RF01',
    };
    if (password?.trim()) {
        await db.collection('studioSecrets').doc(studioId).set({
            arubaPasswordEncrypted: (0, crypto_1.encryptSecret)(password.trim(), secretsKeyValue()),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: request.auth.uid,
        }, { merge: true });
        patch.hasPassword = true;
    }
    else {
        const secretSnap = await db.collection('studioSecrets').doc(studioId).get();
        patch.hasPassword = Boolean(secretSnap.data()?.arubaPasswordEncrypted);
        if (!patch.hasPassword) {
            throw new https_1.HttpsError('invalid-argument', 'Inserisci la password API Aruba.');
        }
    }
    patch.lastTestMessage = 'Credenziali salvate. Esegui un test connessione.';
    await studioRef.set({
        aruba: {
            ...(studioSnap.data()?.aruba ?? {}),
            ...patch,
            configuredAt: firestore_1.FieldValue.serverTimestamp(),
        },
    }, { merge: true });
    return { ok: true, hasPassword: patch.hasPassword };
});
exports.testArubaConnection = (0, https_1.onCall)(arubaCallables, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    const { studioId } = request.data;
    if (!studioId)
        throw new https_1.HttpsError('invalid-argument', 'Studio obbligatorio.');
    await (0, auth_1.assertStudioAccess)(request.auth.uid, studioId);
    const studioSnap = await db.collection('studios').doc(studioId).get();
    if (!studioSnap.exists)
        throw new https_1.HttpsError('not-found', 'Studio non trovato.');
    const aruba = (studioSnap.data()?.aruba || {});
    if (!aruba.username?.trim()) {
        throw new https_1.HttpsError('failed-precondition', 'Configura username Aruba nelle impostazioni.');
    }
    const password = await loadArubaPassword(studioId);
    const environment = normalizeEnvironment(aruba.environment);
    let ok = false;
    let message = '';
    try {
        const auth = await (0, client_1.arubaSignIn)(environment, aruba.username.trim(), password);
        ok = Boolean(auth.accessToken);
        message = ok ? 'Connessione Aruba riuscita.' : 'Connessione non riuscita.';
    }
    catch (err) {
        ok = false;
        message = err instanceof Error ? err.message : 'Connessione Aruba non riuscita.';
    }
    await studioSnap.ref.set({
        aruba: {
            ...aruba,
            lastTestAt: firestore_1.FieldValue.serverTimestamp(),
            lastTestOk: ok,
            lastTestMessage: message,
        },
    }, { merge: true });
    if (!ok)
        throw new https_1.HttpsError('failed-precondition', message);
    return { ok, message, environment };
});
exports.sendArubaInvoice = (0, https_1.onCall)(arubaCallables, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    const { studioId, documentId } = request.data;
    if (!studioId || !documentId) {
        throw new https_1.HttpsError('invalid-argument', 'Studio e documento obbligatori.');
    }
    await (0, auth_1.assertStudioAccess)(request.auth.uid, studioId);
    const studioSnap = await db.collection('studios').doc(studioId).get();
    if (!studioSnap.exists)
        throw new https_1.HttpsError('not-found', 'Studio non trovato.');
    const studio = studioSnap.data() || {};
    const aruba = (studio.aruba || {});
    if (!aruba.enabled) {
        throw new https_1.HttpsError('failed-precondition', 'Fatturazione elettronica non abilitata nelle impostazioni.');
    }
    if (!aruba.username?.trim()) {
        throw new https_1.HttpsError('failed-precondition', 'Credenziali Aruba non configurate.');
    }
    const docRef = db.collection('documents').doc(documentId);
    const docSnap = await docRef.get();
    if (!docSnap.exists)
        throw new https_1.HttpsError('not-found', 'Documento non trovato.');
    const doc = { id: docSnap.id, ...docSnap.data() };
    if (doc.studioId !== studioId)
        throw new https_1.HttpsError('permission-denied', 'Documento di un altro studio.');
    if (doc.type !== 'fattura') {
        throw new https_1.HttpsError('failed-precondition', 'Solo le fatture possono essere inviate allo SDI.');
    }
    if (!['confirmed', 'sent', 'completed'].includes(doc.status)) {
        throw new https_1.HttpsError('failed-precondition', 'Conferma la fattura prima dell\'invio allo SDI.');
    }
    if (doc.aruba?.status === 'sent' && doc.aruba.uploadFileName) {
        throw new https_1.HttpsError('failed-precondition', 'Fattura già inviata ad Aruba.');
    }
    if (doc.subjectType !== 'client' || !doc.subjectId) {
        throw new https_1.HttpsError('failed-precondition', 'La fattura deve avere un cliente associato.');
    }
    const clientSnap = await db.collection('clients').doc(doc.subjectId).get();
    if (!clientSnap.exists)
        throw new https_1.HttpsError('not-found', 'Cliente non trovato.');
    const client = clientSnap.data() || {};
    const destination = resolveCustomerDestination(client);
    const progressivoInvio = await nextProgressivoInvio(studioId);
    let xml = '';
    try {
        xml = (0, fatturaPaXml_1.buildFatturaPaXml)({
            progressivoInvio,
            numeroDocumento: doc.fullNumber || String(doc.rows.length),
            dataDocumento: doc.date,
            cedente: {
                denominazione: String(studio.name || 'Studio'),
                partitaIva: String(studio.vatNumber || ''),
                codiceFiscale: String(studio.fiscalCode || ''),
                indirizzo: String(studio.address || ''),
                cap: String(studio.cap || ''),
                comune: String(studio.city || ''),
                provincia: String(studio.province || ''),
                nazione: 'IT',
                regimeFiscale: aruba.regimeFiscale || 'RF01',
            },
            cessionario: {
                denominazione: String(client.name || doc.subjectName || 'Cliente'),
                partitaIva: typeof client.vatNumber === 'string' ? client.vatNumber : undefined,
                codiceFiscale: typeof client.fiscalCode === 'string' ? client.fiscalCode : undefined,
                indirizzo: String(client.address || doc.subjectAddress || ''),
                cap: String(client.cap || ''),
                comune: String(client.city || ''),
                provincia: String(client.province || ''),
                nazione: String(client.nation || 'IT'),
                codiceDestinatario: destination.codiceDestinatario,
                pec: destination.pec,
            },
            righe: (doc.rows || []).map((row, index) => ({
                numeroLinea: index + 1,
                descrizione: row.description || 'Riga documento',
                quantita: Number(row.quantity || 1),
                prezzoUnitario: Number(row.unitPrice || 0),
                aliquotaIva: Number(row.vatRate ?? 22),
                natura: row.vatNature,
            })),
            totaleImponibile: Number(doc.totalNet || 0),
            totaleImposta: Number(doc.totalVat || 0),
            totaleDocumento: Number(doc.totalDocument || 0),
            modalitaPagamento: paymentModeCode(doc.paymentMethod),
            iban: typeof doc.bankIban === 'string' ? doc.bankIban : typeof studio.bankIban === 'string' ? studio.bankIban : undefined,
            causale: `Fattura ${doc.fullNumber}`,
            riferimentoDocumento: resolveRiferimentoDocumento(doc.electronicInvoiceRef),
        });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Generazione XML non riuscita.';
        await docRef.set({
            aruba: {
                status: 'error',
                errorMessage: message,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        }, { merge: true });
        throw new https_1.HttpsError('failed-precondition', message);
    }
    const password = await loadArubaPassword(studioId);
    const environment = normalizeEnvironment(aruba.environment);
    const auth = await (0, client_1.arubaSignIn)(environment, aruba.username.trim(), password);
    const upload = await (0, client_1.arubaUploadInvoice)(environment, auth.accessToken, xml);
    await docRef.set({
        status: 'sent',
        aruba: {
            status: 'sent',
            environment,
            progressivoInvio,
            uploadFileName: upload.uploadFileName || null,
            sentAt: firestore_1.FieldValue.serverTimestamp(),
            sentBy: request.auth.uid,
            errorMessage: upload.errorDescription || null,
        },
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return {
        ok: true,
        uploadFileName: upload.uploadFileName,
        progressivoInvio,
        message: upload.errorDescription || 'Fattura trasmessa ad Aruba.',
    };
});
//# sourceMappingURL=arubaInvoicing.js.map