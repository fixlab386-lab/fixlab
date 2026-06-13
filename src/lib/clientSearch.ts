import type { Client } from '../types'

export type ClientSearchCriteria = {
  code: string
  name: string
  fiscalCode: string
  vatNumber: string
}

export const EMPTY_CLIENT_SEARCH_CRITERIA: ClientSearchCriteria = {
  code: '',
  name: '',
  fiscalCode: '',
  vatNumber: '',
}

export const GENERIC_CLIENT_LABEL = 'Cliente generico'

function matchesField(value: string | undefined, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (value || '').toLowerCase().includes(q)
}

/** Filtra clienti: ogni campo compilato deve essere contenuto (AND), come FIXLab. */
export function filterClientsByCriteria(clients: Client[], criteria: ClientSearchCriteria): Client[] {
  return clients.filter(
    c =>
      matchesField(c.code, criteria.code) &&
      matchesField(c.name, criteria.name) &&
      matchesField(c.fiscalCode, criteria.fiscalCode) &&
      matchesField(c.vatNumber, criteria.vatNumber),
  )
}
