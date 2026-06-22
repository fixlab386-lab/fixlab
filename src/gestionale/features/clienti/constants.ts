import type { ColonnaId, RaggruppaCriterio, SchedaTabId } from './types'

export const SCHEDA_TABS: { id: SchedaTabId; label: string }[] = [
  { id: 'anagrafica', label: 'Anagrafica' },
  { id: 'rapporti', label: 'Rapporti commerciali' },
  { id: 'riparazioni', label: 'Riparazioni' },
  { id: 'varie', label: 'Varie' },
]

export const RAGGRUPPA_CRITERI: RaggruppaCriterio[] = [
  'Nessuno',
  'Agente',
  'Cap',
  'Città',
  'Cod. destinatario',
  'Codice',
  'Comune',
  'Nazione',
  'Provincia',
  'Regione',
  'Sconto (%)',
  'Tipologia',
  'Pagamento',
]

/** Colonne visibili di default come gestionale enterprise */
export const COLONNE_DEF: { id: ColonnaId; label: string; default: boolean }[] = [
  { id: 'cod', label: 'Cod.', default: true },
  { id: 'denominazione', label: 'Denominazione', default: true },
  { id: 'indirizzo', label: 'Indirizzo', default: false },
  { id: 'cap', label: 'Cap', default: false },
  { id: 'citta', label: 'Città', default: true },
  { id: 'prov', label: 'Prov.', default: true },
  { id: 'nazione', label: 'Nazione', default: false },
  { id: 'codDestinatario', label: 'Cod. destinatario', default: false },
  { id: 'partitaIva', label: 'Partita Iva', default: true },
  { id: 'agente', label: 'Agente', default: false },
  { id: 'dichIntento', label: 'Dich. d\'intento', default: false },
]

export const COLONNE_WIDTH_DEFAULT: Record<ColonnaId, number> = {
  cod: 56,
  denominazione: 180,
  indirizzo: 140,
  cap: 56,
  citta: 100,
  prov: 48,
  nazione: 80,
  codDestinatario: 96,
  partitaIva: 120,
  agente: 100,
  dichIntento: 96,
}

export const STAMPA_MODELLI = ['Scheda cliente/fornitore', 'Elenco'] as const

export const AGENTI = ['(Nessuno)', 'Agente 1', 'Agente 2', 'Agente 3'] as const

export const LISTINI = ['Privati', 'Rivenditori', 'Aziende', 'Convenzionati', 'VIP'] as const

export const PAGAMENTI = [
  'Bonifico anticipato',
  'Bonifico bancario',
  'R.B. 30 Giorni F.M.',
  'R.B. 30-60-90 Giorni F.M.',
  'R.B. 60 gg D.F.',
  'Rimessa Diretta',
  'Contanti',
  'Bonifico 30 gg. d.f.',
  'Bonifico 60 gg. d.f.',
  'RIBA 30 gg F.M.',
  'Carta di credito',
  'Assegno',
] as const

export const NAZIONI = ['Italia', 'San Marino', 'Svizzera', 'Francia', 'Germania', 'Spagna', 'Altro'] as const

export const NUOVO_DOC_ITEMS = [
  'Preventivo',
  'Ordine cliente',
  'Rapporto d\'intervento',
  'Preventivo fornitore',
  'Ordine fornitore',
  'Vendita al banco',
  'Fattura',
  'Fattura pro-forma',
  'Avviso di parcella',
  'Fattura accomp.',
  'Ddt',
  'Nota di credito',
] as const

export const STAMPA_ITEMS = ['Scheda cliente/fornitore', 'Elenco'] as const

export const UTILITA_ITEMS = [
  'Esporta con Excel/OpenOffice/LibreOffice',
  'Importa con Excel/OpenOffice/LibreOffice',
] as const

export const DEFAULT_COLONNE: Record<ColonnaId, boolean> = Object.fromEntries(
  COLONNE_DEF.map(c => [c.id, c.default]),
) as Record<ColonnaId, boolean>
