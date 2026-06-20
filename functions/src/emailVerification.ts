import { createHash, randomInt } from 'crypto'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import nodemailer from 'nodemailer'

const db = getFirestore('fixlab')

const CODE_TTL_MS = 15 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPTS = 5

function smtpConfig() {
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || '587') || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  }
}

function hashCode(uid: string, code: string): string {
  return createHash('sha256').update(`${uid}:${code}:fixlab-verify`).digest('hex')
}

function verificationDocRef(uid: string) {
  return db.collection('emailVerificationCodes').doc(uid)
}

async function sendVerificationEmail(to: string, code: string): Promise<boolean> {
  const { host, port, user, pass } = smtpConfig()
  if (!user || !pass) return false

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: { user, pass },
  })

  const appUrl = process.env.PUBLIC_APP_URL || 'https://fixlab-app.web.app'

  await transporter.sendMail({
    from: `"FIXLab" <${user}>`,
    to,
    subject: 'Codice di verifica FIXLab',
    text:
      `Il tuo codice di verifica FIXLab è: ${code}\n\n` +
      `Inserisci le 6 cifre nell'app FixLab (schermata Verifica email).\n\n` +
      `Il codice scade tra 15 minuti.\n\n` +
      `Se non hai richiesto tu questa email, ignora il messaggio.`,
    html:
      `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:480px;color:#1a1a2e">` +
      `<p style="font-size:16px">Il tuo codice di verifica <strong>FIXLab</strong> è:</p>` +
      `<p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0;color:#2563eb">${code}</p>` +
      `<p style="font-size:14px;line-height:1.5">Apri l'app FixLab e inserisci il codice nella schermata <em>Verifica email</em>.</p>` +
      `<p style="font-size:13px;color:#64748b">Il codice scade tra 15 minuti.</p>` +
      `<p style="font-size:12px;color:#94a3b8;margin-top:24px">` +
      `Hai problemi? Apri <a href="${appUrl}" style="color:#2563eb">${appUrl}</a> nel browser dopo aver verificato l'email.` +
      `</p></div>`,
  })

  return true
}

/** Invia un codice OTP a 6 cifre per verificare l'email (password provider). */
export const requestEmailVerificationCode = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const uid = request.auth.uid
  const authUser = await getAuth().getUser(uid)
  if (authUser.emailVerified) {
    return { sent: false, verified: true }
  }
  if (!authUser.email) {
    throw new HttpsError('failed-precondition', 'Email non disponibile per questo account.')
  }

  const isPasswordProvider = authUser.providerData.some(p => p.providerId === 'password')
  if (!isPasswordProvider) {
    throw new HttpsError('failed-precondition', 'Verifica email non richiesta per questo tipo di account.')
  }

  const docRef = verificationDocRef(uid)
  const existing = await docRef.get()
  if (existing.exists) {
    const data = existing.data() as { sentAt?: Timestamp }
    const sentAtMs = data.sentAt?.toMillis() ?? 0
    const elapsed = Date.now() - sentAtMs
    if (elapsed < RESEND_COOLDOWN_MS) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)
      throw new HttpsError(
        'resource-exhausted',
        `Attendi ${retryAfterSeconds} secondi prima di richiedere un nuovo codice.`,
      )
    }
  }

  const code = String(randomInt(100000, 1000000))
  const expiresAt = Timestamp.fromMillis(Date.now() + CODE_TTL_MS)

  await docRef.set({
    hash: hashCode(uid, code),
    expiresAt,
    sentAt: Timestamp.now(),
    attempts: 0,
    email: authUser.email,
  })

  const sent = await sendVerificationEmail(authUser.email, code)
  if (!sent) {
    return { sent: false, fallback: true }
  }

  return { sent: true }
})

/** Verifica il codice OTP e marca l'email come verificata. */
export const verifyEmailCode = onCall({ region: 'europe-west1' }, async request => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Autenticazione richiesta.')
  }

  const code = request.data?.code
  if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
    throw new HttpsError('invalid-argument', 'Inserisci un codice valido a 6 cifre.')
  }

  const uid = request.auth.uid
  const docRef = verificationDocRef(uid)
  const snap = await docRef.get()
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Nessun codice attivo. Richiedine uno nuovo.')
  }

  const data = snap.data() as {
    hash: string
    expiresAt: Timestamp
    attempts: number
  }

  if (data.attempts >= MAX_ATTEMPTS) {
    await docRef.delete()
    throw new HttpsError('resource-exhausted', 'Troppi tentativi errati. Richiedi un nuovo codice.')
  }

  if (data.expiresAt.toMillis() < Date.now()) {
    await docRef.delete()
    throw new HttpsError('deadline-exceeded', 'Codice scaduto. Richiedine uno nuovo.')
  }

  const expected = hashCode(uid, code.trim())
  if (expected !== data.hash) {
    await docRef.update({ attempts: data.attempts + 1 })
    throw new HttpsError('invalid-argument', 'Codice errato. Controlla e riprova.')
  }

  await getAuth().updateUser(uid, { emailVerified: true })
  await docRef.delete()

  return { verified: true }
})
