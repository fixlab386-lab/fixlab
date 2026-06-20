import { functions } from '../firebase'
import { callCallableWithAuth } from './cloudFunctions'

export type VatLookupResult = {
  valid: boolean
  vatNumber: string
  countryCode: string
  name?: string
  address?: string
  cap?: string
  city?: string
  province?: string
  source: 'vies'
}

/** Verifica una Partita IVA sul registro ufficiale VIES e ne restituisce i dati anagrafici. */
export async function lookupVatNumber(vatNumber: string): Promise<VatLookupResult> {
  return callCallableWithAuth<{ vatNumber: string }, VatLookupResult>(functions, 'lookupVat', { vatNumber })
}
