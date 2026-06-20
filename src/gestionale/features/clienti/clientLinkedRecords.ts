import type { Repair } from '../../../types'
import type { Cliente } from './types'

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

export function clientDisplayName(cliente: Cliente): string {
  return cliente.sedeOperativa.denominazione.trim()
}

/** Riparazioni del cliente (per id o, in fallback, per denominazione). */
export function repairsForCliente(repairs: Repair[], cliente: Cliente): Repair[] {
  if (cliente.isDraft || !cliente.id) return []
  const name = normalizeName(clientDisplayName(cliente))
  return repairs
    .filter(r => {
      if (r.clientId === cliente.id) return true
      if (!r.clientId && name && normalizeName(r.clientName) === name) return true
      return false
    })
    .sort((a, b) => {
      const ta = a.createdAt instanceof Date ? a.createdAt.getTime() : 0
      const tb = b.createdAt instanceof Date ? b.createdAt.getTime() : 0
      return tb - ta
    })
}
