export const PAGAMENTI_SCHEDA_TABS = [
  { id: 'anagrafica', label: 'Anagrafica' },
  { id: 'rapporti', label: 'Rapporti commerciali' },
  { id: 'varie', label: 'Varie' },
] as const

export type PagamentiSchedaTabId = (typeof PAGAMENTI_SCHEDA_TABS)[number]['id']
