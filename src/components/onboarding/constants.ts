import type { StudioFeatures, StudioRepairType } from '../../types'

export const WIZARD_STEPS = [
  { id: 1, title: 'La tua officina' },
  { id: 2, title: 'Che funzionalità vuoi attivare?' },
  { id: 3, title: 'Che tipo di riparazioni gestisci?' },
  { id: 4, title: 'Riepilogo' },
] as const

export const FEATURE_OPTIONS: { key: keyof StudioFeatures; label: string }[] = [
  { key: 'warehouse', label: 'Gestione magazzino ricambi' },
  { key: 'pos', label: 'Cassa / Vendita al banco' },
  { key: 'whatsapp', label: 'Invio automatico WhatsApp ai clienti' },
  { key: 'rtPrinter', label: 'Stampa scontrino RT' },
]

export const REPAIR_TYPE_OPTIONS: { id: StudioRepairType; label: string }[] = [
  { id: 'telefonia', label: 'Telefonia (smartphone/tablet)' },
  { id: 'computer', label: 'Computer e notebook' },
  { id: 'elettrodomestici', label: 'Elettrodomestici' },
  { id: 'console', label: 'Console/gaming' },
  { id: 'multi', label: 'Multi-servizio (più categorie)' },
  { id: 'altro', label: 'Altro' },
]

export function featureLabel(key: keyof StudioFeatures): string {
  return FEATURE_OPTIONS.find(o => o.key === key)?.label ?? key
}

export function repairTypeLabel(id: StudioRepairType): string {
  return REPAIR_TYPE_OPTIONS.find(o => o.id === id)?.label ?? id
}
