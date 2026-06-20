"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailCode = exports.requestEmailVerificationCode = void 0;
const crypto_1 = require("crypto");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const nodemailer_1 = __importDefault(require("nodemailer"));
const db = (0, firestore_1.getFirestore)('fixlab');
const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
function smtpConfig() {
    return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || '587') || 587,
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    };
}
function hashCode(uid, code) {
    return (0, crypto_1.createHash)('sha256').update(`${uid}:${code}:fixlab-verify`).digest('hex');
}
function verificationDocRef(uid) {
    return db.collection('emailVerificationCodes').doc(uid);
}
async function sendVerificationEmail(to, code) {
    const { host, port, user, pass } = smtpConfig();
    if (!user || !pass)
        return false;
    const transporter = nodemailer_1.default.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass },
    });
    const appUrl = process.env.PUBLIC_APP_URL || 'https://fixlab-app.web.app';
    await transporter.sendMail({
        from: `"FIXLab" <${user}>`,
        to,
        subject: 'Codice di verifica FIXLab',
        text: `Il tuo codice di verifica FIXLab è: ${code}\n\n` +
            `Inserisci le 6 cifre nell'app FixLab (schermata Verifica email).\n\n` +
            `Il codice scade tra 15 minuti.\n\n` +
            `Se non hai richiesto tu questa email, ignora il messaggio.`,
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;color:#1a1a2e">` +
            `<p style="font-size:16px">Il tuo codice di verifica <strong>FIXLab</strong> è:</p>` +
            `<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;color:#2563eb">${code}</p>` +
            `<p style="font-size:14px;line-height:1.5">Apri l'app FixLab e inserisci il codice nella schermata <em>Verifica email</em>.</p>` +
            `<p style="font-size:13px;color:#64748b">Il codice scade tra 15 minuti.</p>` +
            `<p style="font-size:12px;color:#94a3b8;margin-top:24px">` +
            `Hai problemi? Apri <a href="${appUrl}" style="color:#2563eb">${appUrl}</a> nel browser dopo aver verificato l'email.` +
            `</p></div>`,
    });
    return true;
}
/** Invia un codice OTP a 6 cifre per verificare l'email (password provider). */
exports.requestEmailVerificationCode = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const uid = request.auth.uid;
    const authUser = await (0, auth_1.getAuth)().getUser(uid);
    if (authUser.emailVerified) {
        return { sent: false, verified: true };
    }
    if (!authUser.email) {
        throw new https_1.HttpsError('failed-precondition', 'Email non disponibile per questo account.');
    }
    const isPasswordProvider = authUser.providerData.some(p => p.providerId === 'password');
    if (!isPasswordProvider) {
        throw new https_1.HttpsError('failed-precondition', 'Verifica email non richiesta per questo tipo di account.');
    }
    const docRef = verificationDocRef(uid);
    const existing = await docRef.get();
    if (existing.exists) {
        const data = existing.data();
        const sentAtMs = data.sentAt?.toMillis() ?? 0;
        const elapsed = Date.now() - sentAtMs;
        if (elapsed < RESEND_COOLDOWN_MS) {
            const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
            throw new https_1.HttpsError('resource-exhausted', `Attendi ${retryAfterSeconds} secondi prima di richiedere un nuovo codice.`);
        }
    }
    const code = String((0, crypto_1.randomInt)(100000, 1000000));
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + CODE_TTL_MS);
    await docRef.set({
        hash: hashCode(uid, code),
        expiresAt,
        sentAt: firestore_1.Timestamp.now(),
        attempts: 0,
        email: authUser.email,
    });
    const sent = await sendVerificationEmail(authUser.email, code);
    if (!sent) {
        return { sent: false, fallback: true };
    }
    return { sent: true };
});
/** Verifica il codice OTP e marca l'email come verificata. */
exports.verifyEmailCode = (0, https_1.onCall)({ region: 'europe-west1' }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Autenticazione richiesta.');
    }
    const code = request.data?.code;
    if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'Inserisci un codice valido a 6 cifre.');
    }
    const uid = request.auth.uid;
    const docRef = verificationDocRef(uid);
    const snap = await docRef.get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'Nessun codice attivo. Richiedine uno nuovo.');
    }
    const data = snap.data();
    if (data.attempts >= MAX_ATTEMPTS) {
        await docRef.delete();
        throw new https_1.HttpsError('resource-exhausted', 'Troppi tentativi errati. Richiedi un nuovo codice.');
    }
    if (data.expiresAt.toMillis() < Date.now()) {
        await docRef.delete();
        throw new https_1.HttpsError('deadline-exceeded', 'Codice scaduto. Richiedine uno nuovo.');
    }
    const expected = hashCode(uid, code.trim());
    if (expected !== data.hash) {
        await docRef.update({ attempts: data.attempts + 1 });
        throw new https_1.HttpsError('invalid-argument', 'Codice errato. Controlla e riprova.');
    }
    await (0, auth_1.getAuth)().updateUser(uid, { emailVerified: true });
    await docRef.delete();
    return { verified: true };
});
//# sourceMappingURL=emailVerification.js.map