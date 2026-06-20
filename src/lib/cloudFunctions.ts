import { httpsCallable, type Functions, type HttpsCallableOptions } from 'firebase/functions'
import { auth } from '../firebase'

export function isCloudFunctionUnavailable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code
  return (
    code === 'functions/not-found' ||
    code === 'functions/unavailable' ||
    code === 'functions/internal' ||
    code === 'unavailable'
  )
}

export function isCallableUnauthenticated(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = (error as { code?: string }).code || ''
  const normalized = code.replace(/^functions\//, '')
  return normalized === 'unauthenticated'
}

/** Garantisce JWT valido prima di chiamate Callable (evita errori «unauthenticated» su token scaduto). */
export async function ensureCallableAuth(): Promise<void> {
  const user = auth.currentUser
  if (!user) {
    const err = new Error('Sessione scaduta: effettua di nuovo l\'accesso.')
    ;(err as { code?: string }).code = 'functions/unauthenticated'
    throw err
  }
  await user.getIdToken(true)
}

export async function callCallableWithAuth<TRequest, TResponse>(
  functions: Functions,
  name: string,
  data: TRequest,
  options?: HttpsCallableOptions,
): Promise<TResponse> {
  const invoke = async () => {
    const fn = httpsCallable<TRequest, TResponse>(functions, name, options)
    const res = await fn(data)
    return res.data
  }

  await ensureCallableAuth()
  try {
    return await invoke()
  } catch (err) {
    if (isCallableUnauthenticated(err)) {
      await ensureCallableAuth()
      return await invoke()
    }
    throw err
  }
}

/** Messaggio leggibile da errori Firebase Callable (es. HttpsError). */
export function formatCallableError(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback
  const err = error as { message?: string; code?: string; details?: unknown }
  const msg = typeof err.message === 'string' ? err.message.trim() : ''
  if (msg && msg !== 'internal' && msg !== err.code) return msg
  const code = typeof err.code === 'string' ? err.code.replace(/^functions\//, '') : ''
  if (code === 'failed-precondition' && msg) return msg
  if (code === 'unauthenticated') return 'Sessione scaduta: effettua di nuovo l\'accesso.'
  if (code === 'permission-denied') return 'Permesso negato per questa operazione.'
  if (code === 'not-found') return msg || 'Risorsa non trovata.'
  if (code === 'invalid-argument') return msg || 'Dati documento non validi.'
  if (code === 'internal') return msg && msg !== 'internal' ? msg : 'Errore server durante il salvataggio. Riprova tra qualche istante.'
  if (msg) return msg
  return fallback
}
