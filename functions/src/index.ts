import { initializeApp } from 'firebase-admin/app'

initializeApp()

export { commitDocument } from './commitDocument'
export { commitStockMovement, revertStockMovement } from './commitStockMovement'
export { syncStudioClaims, onMembershipClaimsSync } from './syncStudioClaims'
export { moveClientToStudio } from './moveClientToStudio'
export { lookupVat } from './vatLookup'
export { requestEmailVerificationCode, verifyEmailCode } from './emailVerification'
export { saveArubaCredentials, testArubaConnection, sendArubaInvoice } from './arubaInvoicing'
export {
  setSuperAdmin,
  impersonateUser,
  deleteStudioComplete,
  getAllStudios,
  extendSubscription,
  updateStudioSubscription,
} from './admin'
export { importDaneaBef } from './daneaBefImport'
export { repairDaneaDocuments } from './repairDaneaDocuments'
