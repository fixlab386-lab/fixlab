import type { ClientExtraIndirizzo, Supplier } from '../../../types'

export type FornitoreDestinazione = {
  id: string
  label: string
  indirizzo: string
  cap: string
  citta: string
  prov: string
  nazione: string
}

function fromExtra(id: string, label: string, row: ClientExtraIndirizzo): FornitoreDestinazione {
  return {
    id,
    label,
    indirizzo: row.indirizzo || '',
    cap: row.cap || '',
    citta: row.citta || '',
    prov: row.prov || '',
    nazione: row.nazione || 'Italia',
  }
}

export function buildSupplierDestinations(supplier: Supplier): FornitoreDestinazione[] {
  const sede: FornitoreDestinazione = {
    id: 'sede',
    label: '(Sede operativa)',
    indirizzo: supplier.address || '',
    cap: supplier.cap || '',
    citta: supplier.city || '',
    prov: supplier.province || '',
    nazione: supplier.nation || 'Italia',
  }

  const out: FornitoreDestinazione[] = [sede]
  const seen = new Set<string>(['sede'])

  const push = (id: string, label: string, row?: ClientExtraIndirizzo) => {
    if (!row || (!row.indirizzo?.trim() && !row.denominazione?.trim())) return
    if (seen.has(id)) return
    seen.add(id)
    out.push(fromExtra(id, label, row))
  }

  if (supplier.extraData?.sedeLegale?.indirizzo?.trim()) {
    push('sede-legale', supplier.extraData.sedeLegale.denominazione || 'Sede legale', supplier.extraData.sedeLegale)
  }
  for (const [i, row] of (supplier.extraData?.sediAmmin || []).entries()) {
    push(`sede-ammin-${i}`, row.denominazione || `Sede amm. ${i + 1}`, row)
  }
  for (const [i, row] of (supplier.extraData?.sediExtra || []).entries()) {
    push(`sede-extra-${i}`, row.denominazione || `Destinazione ${i + 1}`, row)
  }

  return out
}

export function formatAddressLine1(dest: Pick<FornitoreDestinazione, 'indirizzo'>): string {
  return dest.indirizzo.trim()
}

export function formatAddressLine2(dest: Pick<FornitoreDestinazione, 'cap' | 'citta' | 'prov'>): string {
  const capCity = [dest.cap, dest.citta].filter(Boolean).join(' ')
  if (!capCity) return dest.prov ? `(${dest.prov})` : ''
  return dest.prov ? `${capCity} (${dest.prov})` : capCity
}
