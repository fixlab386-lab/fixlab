import { signOut } from 'firebase/auth'
import { auth } from '../firebase'

export async function logoutAndClearSession(): Promise<void> {
  await signOut(auth)
}
