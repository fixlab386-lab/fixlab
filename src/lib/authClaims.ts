import { auth } from '../firebase'

export async function readAuthClaims(forceRefresh = false): Promise<{
  isSuperAdmin: boolean
  isImpersonating: boolean
}> {
  const user = auth.currentUser
  if (!user) {
    return { isSuperAdmin: false, isImpersonating: false }
  }
  const tokenResult = await user.getIdTokenResult(forceRefresh)
  return {
    isSuperAdmin: tokenResult.claims.superAdmin === true,
    isImpersonating: typeof tokenResult.claims.impersonatedBy === 'string',
  }
}

/** Attende che il claim superAdmin compaia nel JWT (max ~8s). */
export async function waitForSuperAdminClaim(maxAttempts = 8): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i += 1) {
    const { isSuperAdmin } = await readAuthClaims(true)
    if (isSuperAdmin) return true
    await new Promise(resolve => window.setTimeout(resolve, 500 + i * 250))
  }
  return false
}
