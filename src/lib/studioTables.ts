/**
 * Tabelle dello Studio (Strumenti → Tabelle): Aliquote IVA, Tipi pagamento,
 * Conti d'acquisto. Sono configurate dal professionista e condivise in tutta
 * l'app. Persistite su `studios/{studioId}.studioTables`.
 */

export type NaturaIva =
  | 'Imponibile'
  | 'Acq. reverse charge'
  | 'Split payment'
  | 'Non imponibile'
  | 'Esente'
  | 'Escluso'
  | 'Fuori campo IVA'

export type AliquotaIva = {
  id: string
  /** Codice breve mostrato in documenti (es. "22", "22d", "10"). */
  codice: string
  naturaIva: NaturaIva
  /** Percentuale aliquota (0 per esenti/non imponibili). */
  aliquota: number
  /** % indetraibile (0-100), opzionale. */
  indetraibile?: number
  descrizione: string
  note?: string
  predefinito?: boolean
}

export type ScadenzaPagamento = 'immediata' | 'fine_mese' | 'gia_saldata' | 'altro'

export type TipoPagamentoVoce = {
  id: string
  nome: string
  /** Modalità FatturaPA / descrittiva (es. "Bonifico", "Contanti"). */
  modalita?: string
  scadenza: ScadenzaPagamento
  /** Giorni per scadenza tipo "30/60/90". */
  giorni?: number
  /** Sposta la scadenza a fine mese / 10 del mese dopo. */
  spostaScadenza?: boolean
  speseIncasso?: boolean
  pagabileTeamSystemPay?: boolean
  predefinito?: boolean
}

export type ContoAcquisto = {
  id: string
  nome: string
  /** Es. "Acquisti / Prestaz. servizi". */
  predefinitoPer?: string
}

export type StudioTables = {
  aliquoteIva: AliquotaIva[]
  tipiPagamento: TipoPagamentoVoce[]
  contiAcquisto: ContoAcquisto[]
}

export function newTableId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function defaultAliquoteIva(): AliquotaIva[] {
  return [
    { id: 'iva_22', codice: '22', naturaIva: 'Imponibile', aliquota: 22, descrizione: 'Imponibile 22%', predefinito: true },
    { id: 'iva_22d', codice: '22d', naturaIva: 'Imponibile', aliquota: 22, indetraibile: 50, descrizione: 'Imp. 22% detr. al 50%' },
    { id: 'iva_22d40', codice: '22d40', naturaIva: 'Imponibile', aliquota: 22, indetraibile: 60, descrizione: 'Imp. 22% detr. al 40%' },
    { id: 'iva_22i', codice: '22i', naturaIva: 'Imponibile', aliquota: 22, indetraibile: 100, descrizione: 'Imp. 22% indetraibile' },
    { id: 'iva_10', codice: '10', naturaIva: 'Imponibile', aliquota: 10, descrizione: 'Imponibile 10%' },
    { id: 'iva_5', codice: '5', naturaIva: 'Imponibile', aliquota: 5, descrizione: 'Imponibile 5%' },
    { id: 'iva_4', codice: '4', naturaIva: 'Imponibile', aliquota: 4, descrizione: 'Imponibile 4%' },
    { id: 'iva_0', codice: '0', naturaIva: 'Esente', aliquota: 0, descrizione: 'Esente / Non imponibile' },
    { id: 'iva_22rc', codice: '22r', naturaIva: 'Acq. reverse charge', aliquota: 22, descrizione: 'Imp. 22% acquisti rev. charge art. 17' },
    { id: 'iva_10rc', codice: '10r', naturaIva: 'Acq. reverse charge', aliquota: 10, descrizione: 'Imp. 10% acquisti rev. charge' },
    { id: 'iva_22sp', codice: '22sp', naturaIva: 'Split payment', aliquota: 22, descrizione: 'Imp. 22% con scissione pagamenti' },
  ]
}

function tp(
  id: string,
  nome: string,
  scadenza: ScadenzaPagamento,
  extra: Partial<TipoPagamentoVoce> = {},
): TipoPagamentoVoce {
  return { id, nome, scadenza, ...extra }
}

function defaultTipiPagamento(): TipoPagamentoVoce[] {
  return [
    tp('pg_contanti', 'Contanti', 'immediata', { modalita: 'Contanti', predefinito: true }),
    tp('pg_bancomat', 'Bancomat', 'immediata', { modalita: 'Bancomat' }),
    tp('pg_carta', 'Carta di credito', 'immediata', { modalita: 'Carta di credito' }),
    tp('pg_assegno', 'Assegno', 'immediata', { modalita: 'Assegno' }),
    tp('pg_assegno_circ', 'Assegno circolare', 'immediata', { modalita: 'Assegno circolare' }),
    tp('pg_contrassegno', 'Contrassegno', 'immediata'),
    tp('pg_paypal', 'PayPal', 'immediata', { modalita: 'PayPal' }),
    tp('pg_corrispettivi', 'Incasso corrispettivi', 'immediata'),
    tp('pg_bonifico', 'Bonifico bancario', 'immediata', { modalita: 'Bonifico' }),
    tp('pg_bonifico30', 'Bonifico 30 gg D.F.', 'altro', { modalita: 'Bonifico', giorni: 30 }),
    tp('pg_bonifico3060', 'Bonifico 30-60 gg F.M.', 'fine_mese', { modalita: 'Bonifico', giorni: 60, spostaScadenza: true }),
    tp('pg_bonifico_vista', 'Bonifico vista fattura', 'immediata', { modalita: 'Bonifico' }),
    tp('pg_riba30', 'RIBA 30 gg F.M.', 'fine_mese', { modalita: 'RIBA', giorni: 30, spostaScadenza: true }),
    tp('pg_riba3060', 'RIBA 30-60 gg F.M.', 'fine_mese', { modalita: 'RIBA', giorni: 60, spostaScadenza: true }),
    tp('pg_riba306090', 'RIBA 30-60-90 gg F.M.', 'fine_mese', { modalita: 'RIBA', giorni: 90, spostaScadenza: true }),
    tp('pg_sdd', 'SDD Core', 'immediata', { modalita: 'SDD' }),
    tp('pg_vista', 'Vista fattura', 'immediata'),
    tp('pg_rimessa', 'Rimessa diretta', 'immediata'),
    tp('pg_doc_indicati', 'Pagato come da relativi documenti sopra indicati', 'gia_saldata'),
  ]
}

function ca(id: string, nome: string, predefinitoPer?: string): ContoAcquisto {
  return predefinitoPer ? { id, nome, predefinitoPer } : { id, nome }
}

function defaultContiAcquisto(): ContoAcquisto[] {
  return [
    ca('co_merci', 'Acquisto merci/materiali', 'Acquisti / Prestaz. servizi'),
    ca('co_ricambi', 'Acquisto ricambi'),
    ca('co_imballaggi', 'Acquisto imballaggi'),
    ca('co_cancelleria', 'Cancelleria e stampati'),
    ca('co_servizi', 'Costi per servizi'),
    ca('co_consulenze', 'Consulenze e prestazioni'),
    ca('co_canone_affitto', 'Canone affitto'),
    ca('co_utenze', 'Utenze (energia, gas, acqua)'),
    ca('co_telefono', 'Telefono e Internet'),
    ca('co_carburanti', 'Carburanti e lubrificanti'),
    ca('co_manutenzioni', 'Manutenzioni e riparazioni'),
    ca('co_cespiti', 'Cespiti / Attrezzature'),
    ca('co_assicurazioni', 'Assicurazioni'),
    ca('co_pubblicita', 'Pubblicità e marketing'),
    ca('co_arrotondamenti', 'Arrotondamenti'),
  ]
}

export function defaultStudioTables(): StudioTables {
  return {
    aliquoteIva: defaultAliquoteIva(),
    tipiPagamento: defaultTipiPagamento(),
    contiAcquisto: defaultContiAcquisto(),
  }
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function normalizeAliquota(raw: unknown, fallbackId: string): AliquotaIva | null {
  if (!isObj(raw)) return null
  const aliquota = Number(raw.aliquota)
  if (!Number.isFinite(aliquota)) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId,
    codice: typeof raw.codice === 'string' ? raw.codice : String(aliquota),
    naturaIva: (typeof raw.naturaIva === 'string' ? raw.naturaIva : 'Imponibile') as NaturaIva,
    aliquota,
    indetraibile: Number.isFinite(Number(raw.indetraibile)) ? Number(raw.indetraibile) : undefined,
    descrizione: typeof raw.descrizione === 'string' ? raw.descrizione : `Aliquota ${aliquota}%`,
    note: typeof raw.note === 'string' ? raw.note : undefined,
    predefinito: raw.predefinito === true,
  }
}

function normalizeTipoPagamento(raw: unknown, fallbackId: string): TipoPagamentoVoce | null {
  if (!isObj(raw)) return null
  const nome = typeof raw.nome === 'string' ? raw.nome.trim() : ''
  if (!nome) return null
  const scadenza = (['immediata', 'fine_mese', 'gia_saldata', 'altro'].includes(String(raw.scadenza))
    ? raw.scadenza
    : 'immediata') as ScadenzaPagamento
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId,
    nome,
    modalita: typeof raw.modalita === 'string' ? raw.modalita : undefined,
    scadenza,
    giorni: Number.isFinite(Number(raw.giorni)) ? Number(raw.giorni) : undefined,
    spostaScadenza: raw.spostaScadenza === true,
    speseIncasso: raw.speseIncasso === true,
    pagabileTeamSystemPay: raw.pagabileTeamSystemPay === true,
    predefinito: raw.predefinito === true,
  }
}

function normalizeConto(raw: unknown, fallbackId: string): ContoAcquisto | null {
  if (!isObj(raw)) return null
  const nome = typeof raw.nome === 'string' ? raw.nome.trim() : ''
  if (!nome) return null
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallbackId,
    nome,
    predefinitoPer: typeof raw.predefinitoPer === 'string' && raw.predefinitoPer ? raw.predefinitoPer : undefined,
  }
}

/** Carica le tabelle dal documento studio, applicando i default se mancanti. */
export function loadStudioTables(data: Record<string, unknown> | undefined): StudioTables {
  const defaults = defaultStudioTables()
  const raw = data?.studioTables
  if (!isObj(raw)) return defaults

  const aliquote = Array.isArray(raw.aliquoteIva)
    ? raw.aliquoteIva.map((r, i) => normalizeAliquota(r, `iva_${i}`)).filter((x): x is AliquotaIva => x !== null)
    : []
  const tipi = Array.isArray(raw.tipiPagamento)
    ? raw.tipiPagamento.map((r, i) => normalizeTipoPagamento(r, `pg_${i}`)).filter((x): x is TipoPagamentoVoce => x !== null)
    : []
  const conti = Array.isArray(raw.contiAcquisto)
    ? raw.contiAcquisto.map((r, i) => normalizeConto(r, `co_${i}`)).filter((x): x is ContoAcquisto => x !== null)
    : []

  return {
    aliquoteIva: aliquote.length > 0 ? aliquote : defaults.aliquoteIva,
    tipiPagamento: tipi.length > 0 ? tipi : defaults.tipiPagamento,
    contiAcquisto: conti.length > 0 ? conti : defaults.contiAcquisto,
  }
}

/** Rimuove le proprietà undefined prima di scrivere su Firestore. */
export function studioTablesToFirestore(tables: StudioTables): { studioTables: StudioTables } {
  const clean = <T extends Record<string, unknown>>(obj: T): T => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined) out[k] = v
    }
    return out as T
  }
  return {
    studioTables: {
      aliquoteIva: tables.aliquoteIva.map(clean),
      tipiPagamento: tables.tipiPagamento.map(clean),
      contiAcquisto: tables.contiAcquisto.map(clean),
    },
  }
}

/** Aliquota predefinita (o la prima imponibile). */
export function getDefaultAliquota(aliquote: AliquotaIva[]): AliquotaIva | undefined {
  return aliquote.find(a => a.predefinito) || aliquote.find(a => a.naturaIva === 'Imponibile') || aliquote[0]
}

export function getDefaultTipoPagamento(tipi: TipoPagamentoVoce[]): TipoPagamentoVoce | undefined {
  return tipi.find(t => t.predefinito) || tipi[0]
}

/** Valori percentuali IVA distinti, ordinati, per i menu a tendina nelle righe. */
export function aliquotaValues(aliquote: AliquotaIva[]): number[] {
  const set = new Set<number>()
  for (const a of aliquote) set.add(a.aliquota)
  return [...set].sort((a, b) => a - b)
}
