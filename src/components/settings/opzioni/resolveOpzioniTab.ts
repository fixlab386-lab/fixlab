import type { OpzioniTabId } from './OpzioniApplicazioneShell'

export function resolveOpzioniTab(tab: string | null): OpzioniTabId {
  const legacy: Record<string, OpzioniTabId> = {
    officina: 'azienda',
    whatsapp: 'varie',
    dati: 'varie',
    legale: 'varie',
  }
  if (tab && legacy[tab]) return legacy[tab]
  const valid: OpzioniTabId[] = ['moduli', 'azienda', 'clienti', 'prodotti', 'documenti', 'fatturazione', 'avvisi', 'varie']
  if (tab && valid.includes(tab as OpzioniTabId)) return tab as OpzioniTabId
  return 'moduli'
}
