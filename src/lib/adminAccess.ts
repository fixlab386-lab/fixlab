export const SUPER_ADMIN_EMAILS = ['studio@gmail.com', 'samuelelazzaro78@gmail.com'] as const

export function isSuperAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const normalized = email.trim().toLowerCase()
  return SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === normalized)
}

export function hasAdminAccess(params: {
  email: string | undefined | null
  isSuperAdminClaim: boolean
}): boolean {
  return params.isSuperAdminClaim || isSuperAdminEmail(params.email)
}
