/** Scorciatoie menu «Nuovo» — stile gestionale enterprise (senza fatturazione elettronica). */

export type NewMenuModalId = 'vendita_banco'

export type NewMenuItem =
  | {
      id: string
      label: string
      icon: string
      kind: 'route'
      to: string
    }
  | {
      id: string
      label: string
      icon: string
      kind: 'modal'
      modal: NewMenuModalId
    }

/** Sezioni separate da divisore (come FIXLab, senza titolo di gruppo). */
export const NEW_MENU_SECTIONS: NewMenuItem[][] = [
  [
    { id: 'cliente', label: 'Cliente', icon: '👤', kind: 'route', to: '/clienti?new=1' },
    { id: 'fornitore', label: 'Fornitore', icon: '🏭', kind: 'route', to: '/fornitori?new=1' },
    { id: 'prodotto', label: 'Prodotto', icon: '📦', kind: 'route', to: '/magazzino?new=1' },
    { id: 'riparazione', label: 'Riparazione', icon: '🔧', kind: 'route', to: '/riparazioni/nuova' },
    { id: 'dispositivo', label: 'Dispositivo', icon: '📱', kind: 'route', to: '/dispositivi?new=1' },
  ],
  [
    { id: 'preventivo', label: 'Preventivo', icon: '📋', kind: 'route', to: '/documenti/nuovo?type=preventivo' },
    { id: 'ddt', label: 'Doc. di trasporto', icon: '🚚', kind: 'route', to: '/documenti/nuovo?type=ddt' },
    { id: 'vendita_banco', label: 'Vendita al banco', icon: '€', kind: 'modal', modal: 'vendita_banco' },
  ],
]
