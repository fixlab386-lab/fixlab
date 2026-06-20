import { sendEmailVerification, type ActionCodeSettings } from 'firebase/auth'
import { auth, functions } from '../firebase'
import { callCallableWithAuth } from './cloudFunctions'

type RequestCodeResponse = {
  sent: boolean
  fallback?: boolean
  verified?: boolean
  retryAfterSeconds?: number
}

type VerifyCodeResponse = {
  verified: boolean
}

const VERIFY_SENT_KEY = 'fixlab_verify_code_sent'

function verifySentStorageKey(uid: string): string {
  return `${VERIFY_SENT_KEY}_${uid}`
}

/** Evita reinvii automatici se l'utente ricarica la pagina verifica. */
export function hasRecentVerificationCodeRequest(uid: string): boolean {
  try {
    const raw = sessionStorage.getItem(verifySentStorageKey(uid))
    if (!raw) return false
    const ts = Number(raw)
    return Number.isFinite(ts) && Date.now() - ts < 15 * 60 * 1000
  } catch {
    return false
  }
}

export function markVerificationCodeRequested(uid: string): void {
  try {
    sessionStorage.setItem(verifySentStorageKey(uid), String(Date.now()))
  } catch {
    /* ignore */
  }
}

export function clearVerificationCodeRequestMark(uid: string): void {
  try {
    sessionStorage.removeItem(verifySentStorageKey(uid))
  } catch {
    /* ignore */
  }
}

function verificationContinueUrl(): string {
  const base = import.meta.env.VITE_PUBLIC_APP_URL || 'https://fixlab-app.web.app'
  return `${base.replace(/\/$/, '')}/#/verify-email`
}

export async function requestEmailVerificationCode(): Promise<RequestCodeResponse> {
  return callCallableWithAuth<Record<string, never>, RequestCodeResponse>(
    functions,
    'requestEmailVerificationCode',
    {},
  )
}

export async function verifyEmailCode(code: string): Promise<VerifyCodeResponse> {
  return callCallableWithAuth<{ code: string }, VerifyCodeResponse>(functions, 'verifyEmailCode', { code })
}

export async function sendFirebaseVerificationEmail(): Promise<void> {
  const user = auth.currentUser
  if (!user) throw new Error('Utente non autenticato.')

  const actionCodeSettings: ActionCodeSettings = {
    url: verificationContinueUrl(),
    handleCodeInApp: false,
  }
  await sendEmailVerification(user, actionCodeSettings)
}

export function mapVerificationError(err: unknown): string {
  const code = (err as { code?: string })?.code || ''
  const message = (err as { message?: string })?.message || ''

  if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
    return 'Troppi tentativi di invio email. Attendi 15–30 minuti e usa «Reinvia codice» oppure il codice già ricevuto.'
  }
  if (code === 'functions/resource-exhausted' || message.includes('Attendi')) {
    return message || 'Attendi prima di richiedere un nuovo codice.'
  }
  if (code === 'functions/not-found') {
    return 'Nessun codice attivo. Richiedine uno nuovo.'
  }
  if (code === 'functions/invalid-argument') {
    return message || 'Codice non valido.'
  }
  if (code === 'functions/deadline-exceeded') {
    return 'Codice scaduto. Richiedine uno nuovo.'
  }
  if (message && !message.startsWith('Firebase:')) {
    return message
  }
  return 'Operazione non riuscita. Riprova tra poco.'
}

export async function reloadAuthUser(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  await user.reload()
  return user.emailVerified
}
