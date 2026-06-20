import type { Agent } from '../../../types'

/** Classi provvigione (allineate a Danea — estendibili in futuro). */
export const PROVVIGIONE_CLASSI = [{ id: 'principale', label: 'Classe principale' }] as const

export type ProvvigioneClasseId = (typeof PROVVIGIONE_CLASSI)[number]['id']

/** Colonne matrice = listini documento. */
export const PROVVIGIONE_LISTINI = [
  { id: 'privati', label: 'Privati' },
  { id: 'aziende', label: 'Aziende' },
  { id: 'convenzionati', label: 'Convenzionati' },
  { id: 'vip', label: 'VIP' },
] as const

export type ProvvigioneListinoId = (typeof PROVVIGIONE_LISTINI)[number]['id']

export function listinoLabelToCommissionKey(listino: string): ProvvigioneListinoId {
  const l = listino.toLowerCase()
  if (l.includes('aziend')) return 'aziende'
  if (l.includes('convenz')) return 'convenzionati'
  if (l.includes('vip')) return 'vip'
  return 'privati'
}

export function emptyCommissionMatrix(flatPercent = 0): Record<string, Record<string, number>> {
  const row: Record<string, number> = {}
  for (const col of PROVVIGIONE_LISTINI) row[col.id] = flatPercent
  return { principale: row }
}

export function normalizeCommissionMatrix(
  raw?: Record<string, Record<string, number>> | null,
  flatPercent = 0,
): Record<string, Record<string, number>> {
  const base = emptyCommissionMatrix(flatPercent)
  if (!raw || typeof raw !== 'object') return base
  for (const classe of PROVVIGIONE_CLASSI) {
    const src = raw[classe.id]
    if (!src || typeof src !== 'object') continue
    for (const col of PROVVIGIONE_LISTINI) {
      const v = src[col.id]
      if (typeof v === 'number' && !Number.isNaN(v)) base[classe.id][col.id] = Math.max(0, Math.min(100, v))
    }
  }
  return base
}

export function getAgentCommissionRate(
  agent: Agent | null | undefined,
  listino: string,
  classe: ProvvigioneClasseId = 'principale',
): number {
  if (!agent) return 0
  const key = listinoLabelToCommissionKey(listino)
  const matrix = normalizeCommissionMatrix(agent.commissionMatrix, agent.commissionPercent ?? 0)
  const fromMatrix = matrix[classe]?.[key]
  if (typeof fromMatrix === 'number') return fromMatrix
  return agent.commissionPercent ?? 0
}

export function calcProvvigioneDocumento(
  agent: Agent | null | undefined,
  listino: string,
  totNetto: number,
): { totVenduto: number; provvigioneDovuta: number; percentuale: number } {
  const totVenduto = Math.round(Math.max(0, totNetto) * 100) / 100
  const percentuale = getAgentCommissionRate(agent, listino)
  const provvigioneDovuta = Math.round(totVenduto * (percentuale / 100) * 100) / 100
  return { totVenduto, provvigioneDovuta, percentuale }
}

export function findAgentByName(agents: Agent[], name: string): Agent | null {
  const trimmed = name.trim()
  if (!trimmed || trimmed === '(Nessuno)') return null
  return agents.find(a => a.name === trimmed) ?? null
}
