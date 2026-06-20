import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { onAuthStateChanged, onIdTokenChanged, User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { syncStudioClaimsAndRefreshToken } from '../lib/syncStudioClaims'
import { readAuthClaims } from '../lib/authClaims'
import { UserProfile } from '../types'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let profileUnsub: (() => void) | undefined

    const refreshClaims = async (firebaseUser: User, forceRefresh = false) => {
      try {
        await firebaseUser.getIdToken(forceRefresh)
        const claims = await readAuthClaims(forceRefresh)
        setIsSuperAdmin(claims.isSuperAdmin)
        setIsImpersonating(claims.isImpersonating)
      } catch {
        setIsSuperAdmin(false)
        setIsImpersonating(false)
      }
    }

    const authUnsub = onAuthStateChanged(auth, firebaseUser => {
      profileUnsub?.()
      profileUnsub = undefined
      setUser(firebaseUser)

      if (firebaseUser) {
        setLoading(true)
        void syncStudioClaimsAndRefreshToken()
          .then(() => refreshClaims(firebaseUser, true))
          .catch(err => {
            console.warn('FIXLab: sync custom claims Storage non riuscita al login.', err)
            void refreshClaims(firebaseUser, true)
          })

        profileUnsub = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          profileDoc => {
            if (profileDoc.exists()) {
              setUserProfile({ id: profileDoc.id, ...profileDoc.data() } as UserProfile)
            } else {
              setUserProfile(null)
              console.warn(
                'FIXLab: profilo utente Firestore mancante (users/' +
                  firebaseUser.uid +
                  '). Completare la registrazione o contattare il supporto.',
              )
            }
            setLoading(false)
          },
          err => {
            console.warn('FIXLab: listener profilo utente non riuscito.', err)
            setUserProfile(null)
            setLoading(false)
          },
        )
      } else {
        setUserProfile(null)
        setIsSuperAdmin(false)
        setIsImpersonating(false)
        setLoading(false)
      }
    })

    const tokenUnsub = onIdTokenChanged(auth, firebaseUser => {
      if (firebaseUser) void refreshClaims(firebaseUser, false)
    })

    return () => {
      authUnsub()
      tokenUnsub()
      profileUnsub?.()
    }
  }, [])

  return { user, userProfile, isSuperAdmin, isImpersonating, loading }
}
