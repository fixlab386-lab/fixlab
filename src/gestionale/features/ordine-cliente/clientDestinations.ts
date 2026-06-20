import type { Client, ClientExtraIndirizzo } from '../../../types'

export type ClienteDestinazione = {
  id: string
  label: string
  indirizzo: string
  cap: string
  citta: string
  prov: string
  nazione: string
}

function fromExtra(id: string, label: string, row: ClientExtraIndirizzo): ClienteDestinazione {
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

export function buildClientDestinations(client: Client): ClienteDestinazione[] {
  const sede: ClienteDestinazione = {
    id: 'sede',
    label: '(Sede operativa)',
    indirizzo: client.address || '',
    cap: client.cap || '',
    citta: client.city || '',
    prov: client.province || '',
    nazione: client.nation || 'Italia',
  }

  const out: ClienteDestinazione[] = [sede]
  const seen = new Set<string>(['sede'])

  const push = (id: string, label: string, row?: ClientExtraIndirizzo) => {
    if (!row || (!row.indirizzo?.trim() && !row.denominazione?.trim())) return
    const key = id
    if (seen.has(key)) return
    seen.add(key)
    out.push(fromExtra(key, label, row))
  }

  if (client.extraData?.sedeLegale?.indirizzo?.trim()) {
    push('sede-legale', client.extraData.sedeLegale.denominazione || 'Sede legale', client.extraData.sedeLegale)
  }
  for (const [i, row] of (client.extraData?.sediAmmin || []).entries()) {
    push(`sede-ammin-${i}`, row.denominazione || `Sede amm. ${i + 1}`, row)
  }
  for (const [i, row] of (client.extraData?.sediExtra || []).entries()) {
    push(`sede-extra-${i}`, row.denominazione || `Destinazione ${i + 1}`, row)
  }

  return out
}

export function formatAddressLine1(dest: Pick<ClienteDestinazione, 'indirizzo'>): string {
  return dest.indirizzo.trim()
}

export function formatAddressLine2(dest: Pick<ClienteDestinazione, 'cap' | 'citta' | 'prov'>): string {
  const capCity = [dest.cap, dest.citta].filter(Boolean).join(' ')
  if (!capCity) return dest.prov ? `(${dest.prov})` : ''
  return dest.prov ? `${capCity} (${dest.prov})` : capCity
}
