import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  deleteUser,
  type User,
  type UserCredential,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { membershipDocId } from './studioMemberships'
import { createTrialSubscription } from './subscription'

const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export function isElectronApp(): boolean {
  return window.fixlabDesktop?.isElectron === true
}

export function isGoogleProvider(user: User): boolean {
  return user.providerData.some(p => p.providerId === 'google.com')
}

export function isPasswordProvider(user: User): boolean {
  return user.providerData.some(p => p.providerId === 'password')
}

export function needsEmailVerification(user: User, userProfile?: { emailVerificationPending?: boolean } | null): boolean {
  if (isGoogleProvider(user)) return false
  if (user.emailVerified) return false
  if (!isPasswordProvider(user)) return false
  if (userProfile?.emailVerificationPending === true) return true
  // Profilo non ancora in cache subito dopo la registrazione: blocca l'accesso finché non verificato.
  if (!userProfile) return true
  return false
}

export async function signInWithGoogle(): Promise<UserCredential | null> {
  if (isElectronApp()) {
    await signInWithRedirect(auth, googleProvider)
    return null
  }
  return signInWithPopup(auth, googleProvider)
}

export async function handleGoogleRedirectResult(): Promise<UserCredential | null> {
  try {
    return await getRedirectResult(auth)
  } catch {
    return null
  }
}

export type CreateStudioProfileOptions = {
  emailVerificationPending?: boolean
}

export async function createStudioProfile(
  uid: string,
  email: string,
  name: string,
  shopName: string,
  options?: CreateStudioProfileOptions,
): Promise<void> {
  const emailVerificationPending = options?.emailVerificationPending ?? true
  const membership = { studioId: uid, role: 'owner' as const }
  const trial = createTrialSubscription()

  await setDoc(doc(db, 'studios', uid), {
    name: shopName,
    email,
    ownerId: uid,
    subscription: trial,
    isActive: true,
    createdAt: serverTimestamp(),
  })
  await setDoc(doc(db, 'users', uid), {
    studioId: uid,
    email,
    name,
    role: 'admin',
    lang: 'it',
    memberships: [membership],
    defaultStudioId: uid,
    emailVerificationPending,
    createdAt: serverTimestamp(),
  })
  await setDoc(doc(db, 'memberships', membershipDocId(uid, uid)), {
    userId: uid,
    studioId: uid,
    role: 'owner',
    createdAt: serverTimestamp(),
  })
}

export async function ensureUserProfileAfterAuth(user: User): Promise<'complete' | 'needs_profile'> {
  const profileDoc = await getDoc(doc(db, 'users', user.uid))
  if (profileDoc.exists()) return 'complete'
  return 'needs_profile'
}

export async function resolvePostAuthPath(user: User): Promise<'/' | '/complete-profile' | '/verify-email'> {
  const status = await ensureUserProfileAfterAuth(user)
  if (status === 'needs_profile') return '/complete-profile'

  const profileDoc = await getDoc(doc(db, 'users', user.uid))
  const profile = profileDoc.exists() ? profileDoc.data() : null
  if (needsEmailVerification(user, profile)) return '/verify-email'
  return '/'
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string,
  shopName: string,
): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  try {
    await createStudioProfile(cred.user.uid, email, name, shopName)
  } catch (err) {
    try {
      await deleteUser(cred.user)
    } catch (rollbackErr) {
      console.warn('FIXLab: rollback account Auth dopo errore profilo non riuscito.', rollbackErr)
    }
    throw err
  }
  // Verifica via codice OTP sulla pagina /verify-email (evita doppio invio Firebase → too-many-requests).
  return cred.user
}

export function mapAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Indirizzo email non valido.'
    case 'auth/user-disabled':
      return 'Account disabilitato. Contatta il supporto.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email o password errati.'
    case 'auth/email-already-in-use':
      return 'Questa email è già registrata.'
    case 'auth/weak-password':
      return 'Password troppo debole (minimo 6 caratteri).'
    case 'auth/too-many-requests':
      return 'Troppi tentativi. Riprova tra qualche minuto.'
    case 'auth/popup-closed-by-user':
      return 'Accesso con Google annullato.'
    case 'auth/account-exists-with-different-credential':
      return 'Esiste già un account con questa email. Accedi con email e password.'
    case 'auth/network-request-failed':
      return 'Errore di rete. Controlla la connessione.'
    default:
      return 'Operazione non riuscita. Riprova tra poco.'
  }
}
