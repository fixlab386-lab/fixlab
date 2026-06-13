import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged, User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { syncStudioClaimsAndRefreshToken } from '../lib/syncStudioClaims'
import { UserProfile } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        void syncStudioClaimsAndRefreshToken().catch(err => {
          console.warn('FIXLab: sync custom claims Storage non riuscita al login.', err)
        })
        const profileDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (profileDoc.exists()) {
          setUserProfile({ id: profileDoc.id, ...profileDoc.data() } as UserProfile)
        } else {
          setUserProfile(null)
          console.warn('FIXLab: profilo utente Firestore mancante (users/' + firebaseUser.uid + '). Completare la registrazione o contattare il supporto.')
        }
      } else {
        setUserProfile(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  return { user, userProfile, loading }
}