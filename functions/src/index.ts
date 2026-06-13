import { initializeApp } from 'firebase-admin/app'

initializeApp()

export { commitDocument } from './commitDocument'
export { commitStockMovement, revertStockMovement } from './commitStockMovement'
export { syncStudioClaims, onMembershipClaimsSync } from './syncStudioClaims'
export { moveClientToStudio } from './moveClientToStudio'
