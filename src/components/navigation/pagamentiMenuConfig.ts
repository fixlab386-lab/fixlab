export type PagamentiMenuActionId =
  | 'tutti'
  | 'entrate'
  | 'uscite'
  | 'da_saldare_al'
  | 'invio_solleciti'
  | 'riba'
  | 'bonifici'
  | 'impostazioni_risorse'

export type PagamentiMenuItem = {
  id: PagamentiMenuActionId
  label: string
  icon?: string
  dividerBefore?: boolean
}

export const PAGAMENTI_MENU_ITEMS: PagamentiMenuItem[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'entrate', label: 'Entrate' },
  { id: 'uscite', label: 'Uscite' },
  { id: 'da_saldare_al', label: 'Da saldare al…', dividerBefore: true },
  { id: 'invio_solleciti', label: 'Invio solleciti' },
  { id: 'riba', label: 'RIBA da emettere' },
  { id: 'bonifici', label: 'Bonifici da pagare' },
  { id: 'impostazioni_risorse', label: 'Impostazioni banche e risorse…', icon: '⚙', dividerBefore: true },
]
