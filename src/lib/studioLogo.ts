import { FirebaseError } from 'firebase/app'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { syncStudioClaimsAndRefreshToken } from './syncStudioClaims'

const MAX_LOGO_BYTES = 2 * 1024 * 1024

function isStorageUnauthorized(err: unknown): boolean {
  if (!(err instanceof FirebaseError)) return false
  return err.code === 'storage/unauthorized' || err.code === 'storage/unauthenticated'
}

async function uploadLogoBytes(studioId: string, file: File): Promise<void> {
  const storageRef = ref(storage, `studios/${studioId}/logo`)
  await uploadBytes(storageRef, file)
}

export async function uploadStudioLogoFile(studioId: string, file: File): Promise<string> {
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('Il file è troppo grande — max 2MB')
  }

  try {
    await uploadLogoBytes(studioId, file)
  } catch (err) {
    if (!isStorageUnauthorized(err)) throw err
    await syncStudioClaimsAndRefreshToken()
    await uploadLogoBytes(studioId, file)
  }

  const storageRef = ref(storage, `studios/${studioId}/logo`)
  return getDownloadURL(storageRef)
}

export async function uploadStudioLogo(studioId: string, file: File): Promise<string> {
  const url = await uploadStudioLogoFile(studioId, file)
  await updateDoc(doc(db, 'studios', studioId), { logoUrl: url })
  return url
}
