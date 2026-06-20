/** Tipi e configurazione per la schermata Analisi (stile Danea Easyfatt). */

export type AnalisiKind = 'vendite' | 'acquisti' | 'flussi'

/** Cosa calcolare (menu «Calcola»). */
export type AnalisiCalc = 'totDovuto' | 'imponibile' | 'iva' | 'quantita' | 'numero'

/** Dimensione di raggruppamento (menu «Analisi per» + «Altro…»). */
export type AnalisiDimension =
  // Temporali
  | 'mese'
  | 'giorno'
  | 'settimana'
  | 'anno'
  | 'giornoSettimana'
  | 'giornoMese'
  | 'singoliDocumenti'
  // Soggetto
  | 'cliente'
  | 'codSoggetto'
  | 'citta'
  | 'provincia'
  | 'nazione'
  | 'regione'
  | 'agente'
  | 'listino'
  | 'pagamento'
  | 'coordBancarie'
  // Prodotto (esplode le righe)
  | 'categoriaProdotto'
  | 'sottocatProdotto'
  | 'prodotto'
  | 'codiceProdotto'
  | 'descrProdotto'
  | 'produttoreProdotto'
  | 'fornitoreProdotto'
  | 'codiceIva'

/** Periodo (menu «Periodo»). */
export type AnalisiPeriod =
  | 'tutti'
  | 'meseCorrente'
  | 'meseScorso'
  | 'annoCorrente'
  | 'annoScorso'
  | 'oggi'
  | 'ieri'
  | 'settimanaCorrente'
  | 'settimanaScorsa'
  | 'trimestreCorrente'
  | 'trimestreScorso'
  | 'month'
  | 'custom'

/** Selezione periodo completa (radio base + «Altro…»). */
export type PeriodSelection = {
  period: AnalisiPeriod
  /** Per period === 'month'. */
  year?: number
  month?: number
  /** Per period === 'custom'. */
  customFrom?: string
  customTo?: string
}

export const ANALISI_KIND_LABELS: Record<AnalisiKind, string> = {
  vendite: 'Analisi vendite',
  acquisti: 'Analisi acquisti',
  flussi: 'Analisi flussi',
}

/** Radio base del riquadro «Periodo» (come Danea). */
export const ANALISI_BASE_PERIODS: { id: AnalisiPeriod; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'meseCorrente', label: 'Mese corrente' },
  { id: 'meseScorso', label: 'Mese scorso' },
  { id: 'annoCorrente', label: 'Anno corrente' },
  { id: 'annoScorso', label: 'Anno scorso' },
]

/** Opzioni periodo mostrate come radio nella sidebar (base + personalizzato). */
export const ANALISI_PERIOD_OPTIONS: { id: AnalisiPeriod; label: string }[] = [
  { id: 'tutti', label: 'Tutti' },
  { id: 'meseCorrente', label: 'Mese corrente' },
  { id: 'meseScorso', label: 'Mese scorso' },
  { id: 'annoCorrente', label: 'Anno corrente' },
  { id: 'annoScorso', label: 'Anno scorso' },
  { id: 'custom', label: 'Personalizzato' },
]

/** Opzioni rapide del popup «Altro…» del periodo (come Danea). */
export const ANALISI_PERIOD_QUICK: { id: AnalisiPeriod; label: string }[] = [
  { id: 'oggi', label: 'Oggi' },
  { id: 'ieri', label: 'Ieri' },
  { id: 'settimanaCorrente', label: 'Settimana corrente' },
  { id: 'settimanaScorsa', label: 'Settimana scorsa' },
  { id: 'trimestreCorrente', label: 'Trimestre corrente' },
  { id: 'trimestreScorso', label: 'Trimestre scorso' },
]

const MESI_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]

/** Genera gli ultimi `count` mesi (dal più recente) per il popup «Altro…». */
export function lastMonths(count = 13, now = new Date()): { year: number; month: number; label: string }[] {
  const out: { year: number; month: number; label: string }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ year: d.getFullYear(), month: d.getMonth(), label: `${MESI_IT[d.getMonth()]} ${d.getFullYear()}` })
  }
  return out
}

/** Etichetta leggibile della selezione periodo (per il bottone «Altro…»). */
export function periodSelectionLabel(sel: PeriodSelection): string {
  switch (sel.period) {
    case 'oggi':
      return 'Oggi'
    case 'ieri':
      return 'Ieri'
    case 'settimanaCorrente':
      return 'Settimana corrente'
    case 'settimanaScorsa':
      return 'Settimana scorsa'
    case 'trimestreCorrente':
      return 'Trimestre corrente'
    case 'trimestreScorso':
      return 'Trimestre scorso'
    case 'month':
      return sel.year != null && sel.month != null ? `${MESI_IT[sel.month]} ${sel.year}` : 'Mese…'
    case 'custom': {
      const fmt = (s?: string) => {
        if (!s) return '…'
        const d = new Date(s)
        return Number.isNaN(d.getTime()) ? '…' : d.toLocaleDateString('it-IT')
      }
      return `${fmt(sel.customFrom)} – ${fmt(sel.customTo)}`
    }
    default:
      return 'Altro…'
  }
}

/** true se la selezione corrisponde a una delle voci del popup «Altro…». */
export function isAltroPeriod(period: AnalisiPeriod): boolean {
  return !ANALISI_BASE_PERIODS.some(p => p.id === period)
}

export const ANALISI_CALC_OPTIONS: { id: AnalisiCalc; label: string }[] = [
  { id: 'totDovuto', label: 'Tot. dovuto' },
  { id: 'imponibile', label: 'Imponibile' },
  { id: 'iva', label: 'IVA' },
  { id: 'quantita', label: 'Quantità' },
  { id: 'numero', label: 'Numero documenti' },
]

/** Opzioni rapide mostrate direttamente nella sidebar «Analisi per». */
export const ANALISI_PRIMARY_DIMENSIONS: { id: AnalisiDimension; label: string }[] = [
  { id: 'mese', label: 'Mese' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'regione', label: 'Regione' },
  { id: 'agente', label: 'Agente' },
  { id: 'categoriaProdotto', label: 'Categoria prodotto' },
]

/** Elenco completo del menu «Altro…» (come Danea). */
export const ANALISI_ALL_DIMENSIONS: { id: AnalisiDimension; label: string }[] = [
  { id: 'singoliDocumenti', label: 'Singoli documenti' },
  { id: 'giorno', label: 'Giorno' },
  { id: 'settimana', label: 'Settimana' },
  { id: 'mese', label: 'Mese' },
  { id: 'anno', label: 'Anno' },
  { id: 'giornoSettimana', label: 'Giorno della settimana' },
  { id: 'giornoMese', label: 'Giorno del mese' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'codSoggetto', label: 'Cod. soggetto' },
  { id: 'citta', label: 'Città' },
  { id: 'provincia', label: 'Provincia' },
  { id: 'regione', label: 'Regione' },
  { id: 'nazione', label: 'Nazione' },
  { id: 'listino', label: 'Listino' },
  { id: 'pagamento', label: 'Pagamento' },
  { id: 'coordBancarie', label: 'Coord. bancarie' },
  { id: 'agente', label: 'Agente' },
  { id: 'categoriaProdotto', label: 'Categoria prodotto' },
  { id: 'sottocatProdotto', label: 'Sottocat. prodotto' },
  { id: 'prodotto', label: 'Prodotto' },
  { id: 'codiceProdotto', label: 'Codice prodotto' },
  { id: 'descrProdotto', label: 'Descr. prodotto' },
  { id: 'produttoreProdotto', label: 'Produttore prodotto' },
  { id: 'fornitoreProdotto', label: 'Fornitore prodotto' },
  { id: 'codiceIva', label: 'Codice IVA' },
]

export const ANALISI_DIMENSION_LABELS: Record<AnalisiDimension, string> = {
  mese: 'Mese',
  giorno: 'Giorno',
  settimana: 'Settimana',
  anno: 'Anno',
  giornoSettimana: 'Giorno della settimana',
  giornoMese: 'Giorno del mese',
  singoliDocumenti: 'Documento',
  cliente: 'Cliente',
  codSoggetto: 'Cod. soggetto',
  citta: 'Città',
  provincia: 'Provincia',
  nazione: 'Nazione',
  regione: 'Regione',
  agente: 'Agente',
  listino: 'Listino',
  pagamento: 'Pagamento',
  coordBancarie: 'Coord. bancarie',
  categoriaProdotto: 'Categoria prodotto',
  sottocatProdotto: 'Sottocat. prodotto',
  prodotto: 'Prodotto',
  codiceProdotto: 'Codice prodotto',
  descrProdotto: 'Descr. prodotto',
  produttoreProdotto: 'Produttore prodotto',
  fornitoreProdotto: 'Fornitore prodotto',
  codiceIva: 'Codice IVA',
}

/** Dimensioni che richiedono di esplodere le righe documento (livello prodotto). */
export const PRODUCT_LEVEL_DIMENSIONS: ReadonlySet<AnalisiDimension> = new Set<AnalisiDimension>([
  'categoriaProdotto',
  'sottocatProdotto',
  'prodotto',
  'codiceProdotto',
  'descrProdotto',
  'produttoreProdotto',
  'fornitoreProdotto',
  'codiceIva',
])

export function isProductLevelDimension(dim: AnalisiDimension): boolean {
  return PRODUCT_LEVEL_DIMENSIONS.has(dim)
}
