/** Opzioni applicazione — persistite su studios.appOptions */

import type { TemplateCanvasElement } from './templateCanvas'

export type PrintLayoutId = 'layout_conferma_ordine' | 'standard_jsPDF' | 'vendita_banco_gestionale'

export const DEFAULT_PRINT_LAYOUT: PrintLayoutId = 'layout_conferma_ordine'

/** Campi personalizzabili del template stampa (base: Conferma d'ordine). */
export type DocumentTemplateFields = {
  clientBoxTitle: string
  secondBoxTitle: string
  showSecondBox: boolean
  signatureLabel: string
  totalLabel: string
  /** Layout canvas WYSIWYG (posizione e stile elementi). */
  canvasElements?: TemplateCanvasElement[]
}

export type DocumentoTipoOptions = {
  enabled: boolean
  destPredefinito: string
  usaPrezziIvati: boolean
  bloccaModifiche: boolean
  numerazAutomatica: boolean
  titoloStampa: string
  noteFine: string
  layoutTemplate: PrintLayoutId
  template: DocumentTemplateFields
}

export type ApplicationOptions = {
  azienda: {
    nation: string
    regImprese: string
    pec: string
    fax: string
    phone2: string
    phone3: string
    altro: string
  }
  moduli: {
    controlloAccessi: boolean
    ritenutePrevidenziali: boolean
    teamSystemPay: boolean
    ecommerce: boolean
    ecocontributo: boolean
    ecocontributoTipo: string
    semaforoEventiNegativi: boolean
    magazzinoGestione: boolean
    magazzinoMultiplo: boolean
    lottiScadenzeSeriali: boolean
    taglieColori: boolean
    barcodePrezzoVariabile: boolean
    terminaliPortatili: boolean
    terminaleFormato: string
    registratoreCassa: boolean
    venditaTouchscreen: boolean
    carteFedelta: boolean
  }
  clienti: {
    codiceAutomatico: boolean
    prossimoCodice: string
    autocompletamentoIndirizzo: boolean
    campiAggiuntivi: string[]
  }
  prodotti: {
    decimaliPrezzoVendita: number
    decimaliPrezzoAcquisto: number
    mostraDimensioniPeso: boolean
    codiceAutomatico: boolean
    prossimoCodice: string
    tipologiaDefault: string
    venditaTouch: boolean
    campiAggiuntivi: string[]
    incrementaQtaDuplicati: boolean
    avvisiSonoriBarcode: boolean
  }
  documenti: {
    decimaliQta: string
    campiAggiuntivi: string[]
    tipi: Record<string, DocumentoTipoOptions>
  }
  avvisi: Record<string, boolean>
  varie: {
    inviaDiagnostica: boolean
    simboloValuta: string
    posizioneValuta: 'Sinistra' | 'Destra'
    nascondiSimboloRigheCentrali: boolean
    numerazReverseCharge: string
    chiediBolli: boolean
    bolliTipo: string
    bolliSoglia: number
    bolliAncheOrdiniPreventivi: boolean
    ivaPerCassa: boolean
  }
}

export const DOCUMENT_TYPES_FOR_OPTIONS = [
  'preventivo',
  'conferma_ordine',
  'ordine_cliente',
  'ddt',
  'rapporto_intervento',
  'fattura',
  'fattura_proforma',
  'fattura_acconto',
  'fattura_accomp',
  'vendita_banco',
  'preventivo_fornitore',
  'ordine_fornitore',
  'arrivo_merce',
] as const

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  preventivo: 'Preventivo',
  conferma_ordine: "Conferma d'ordine",
  ordine_cliente: 'Ordine cliente',
  ddt: 'Documento di trasporto',
  rapporto_intervento: "Rapporto d'intervento",
  fattura: 'Fattura',
  fattura_proforma: 'Fattura pro-forma',
  fattura_acconto: "Fattura d'acconto",
  fattura_accomp: 'Fattura accompagnatoria',
  vendita_banco: 'Vendita al banco',
  preventivo_fornitore: 'Preventivo fornitore',
  ordine_fornitore: 'Ordine fornitore',
  arrivo_merce: 'Arrivo merce',
}

function defaultTemplateFields(typeId: string): DocumentTemplateFields {
  const isRepair = typeId === 'conferma_ordine' || typeId === 'rapporto_intervento'
  return {
    clientBoxTitle: 'Cliente',
    secondBoxTitle: isRepair ? 'Informazioni dispositivo' : 'Note',
    showSecondBox: isRepair,
    signatureLabel: 'Firma per accettazione',
    totalLabel: 'Tot. documento',
  }
}

export function resolveDocumentTemplateFields(
  typeId: string,
  partial?: Partial<DocumentTemplateFields>,
): DocumentTemplateFields {
  return { ...defaultTemplateFields(typeId), ...partial }
}

export function normalizePrintLayoutId(id: string | undefined): PrintLayoutId {
  if (id === 'danea_conferma_ordine' || id === 'layout_conferma_ordine') return 'layout_conferma_ordine'
  if (id === 'vendita_banco_gestionale') return 'vendita_banco_gestionale'
  if (id === 'standard_jsPDF') return 'standard_jsPDF'
  return DEFAULT_PRINT_LAYOUT
}

function defaultDocTipo(typeId: string, label: string, layoutTemplate: PrintLayoutId = DEFAULT_PRINT_LAYOUT): DocumentoTipoOptions {
  return {
    enabled: true,
    destPredefinito: 'Destinazione merce',
    usaPrezziIvati: true,
    bloccaModifiche: false,
    numerazAutomatica: true,
    titoloStampa: label,
    noteFine: '',
    layoutTemplate,
    template: defaultTemplateFields(typeId),
  }
}

export const AVVISI_ITEMS: { id: string; label: string; group: string }[] = [
  {
    id: 'note_credito_qta_positive',
    label: 'Note d\'accredito: avvisa in caso di inserimento di quantità positive',
    group: 'Avvisi documenti',
  },
  {
    id: 'conferma_vendita_banco_successiva',
    label: 'Chiedi conferma per passare alla vendita al banco successiva',
    group: 'Avvisi documenti',
  },
  { id: 'numeri_duplicati', label: 'Avvisa se vi sono Numeri duplicati', group: 'Avvisi documenti' },
  {
    id: 'progressione_numeri_date',
    label: 'Avvisa se la progressione Numeri/Date non è corretta',
    group: 'Avvisi documenti',
  },
  {
    id: 'qta_multiplo',
    label: 'Avvisa se la q.tà ordinata non è un multiplo corretto',
    group: 'Avvisi documenti',
  },
  {
    id: 'data_inizio_trasporto',
    label: 'Avvisa se non è stata inserita la "Data e ora di inizio trasporto"',
    group: 'Avvisi documenti',
  },
  {
    id: 'magazzino_mancante',
    label: 'Avvisa se non è stato indicato il magazzino da movimentare',
    group: 'Avvisi documenti',
  },
  {
    id: 'cf_piva_errati',
    label: 'Avvisa se Cod. fiscale/Partita Iva sono errati o mancanti',
    group: 'Avvisi documenti',
  },
  {
    id: 'insoluti_nuovo_doc',
    label: 'Avvisa se vi sono insoluti quando si crea un nuovo documento',
    group: 'Avvisi documenti',
  },
  {
    id: 'iva_20_post_2011',
    label: 'Avvisa se si utilizza Iva al 20% su documenti successivi al 16 settembre 2011',
    group: 'Avvisi documenti',
  },
  {
    id: 'iva_21_post_2013',
    label: 'Avvisa se si utilizza Iva al 21% su documenti successivi al 30 settembre 2013',
    group: 'Avvisi documenti',
  },
  {
    id: 'prezzo_inferiore_acquisto',
    label: 'Avvisa se si stanno vendendo prodotti ad un prezzo inferiore a quello di acquisto',
    group: 'Avvisi documenti',
  },
  {
    id: 'email_massa_smtp',
    label: "Quando si stanno per inviare molte e-mail suggerisci l'invio diretto al server di posta in uscita",
    group: 'Avvisi e-mail',
  },
  {
    id: 'prima_fe_mese',
    label: 'Avvisa quando si emette la prima fattura elettronica del mese',
    group: 'Avvisi fatturazione elettronica',
  },
  {
    id: 'qta_superiore_giacenza',
    label: 'Avvisa se si sta prelevando una quantità superiore a quella disponibile',
    group: 'Avvisi magazzino',
  },
]

export function defaultApplicationOptions(): ApplicationOptions {
  const tipi: Record<string, DocumentoTipoOptions> = {}
  for (const id of DOCUMENT_TYPES_FOR_OPTIONS) {
    const layout = id === 'vendita_banco' ? ('vendita_banco_gestionale' as PrintLayoutId) : DEFAULT_PRINT_LAYOUT
    tipi[id] = defaultDocTipo(id, DOCUMENT_TYPE_LABELS[id] ?? id, layout)
  }
  const avvisi: Record<string, boolean> = {}
  for (const item of AVVISI_ITEMS) {
    avvisi[item.id] = ![
      'data_inizio_trasporto',
      'cf_piva_errati',
      'insoluti_nuovo_doc',
      'iva_20_post_2011',
    ].includes(item.id)
  }
  return {
    azienda: {
      nation: 'Italia',
      regImprese: '',
      pec: '',
      fax: '',
      phone2: '',
      phone3: '',
      altro: '',
    },
    moduli: {
      controlloAccessi: false,
      ritenutePrevidenziali: false,
      teamSystemPay: false,
      ecommerce: false,
      ecocontributo: false,
      ecocontributoTipo: 'RAEE',
      semaforoEventiNegativi: false,
      magazzinoGestione: true,
      magazzinoMultiplo: false,
      lottiScadenzeSeriali: false,
      taglieColori: false,
      barcodePrezzoVariabile: false,
      terminaliPortatili: true,
      terminaleFormato: 'A6Q',
      registratoreCassa: false,
      venditaTouchscreen: true,
      carteFedelta: false,
    },
    clienti: {
      codiceAutomatico: true,
      prossimoCodice: '0063',
      autocompletamentoIndirizzo: true,
      campiAggiuntivi: ['Solvibilità', 'Tipologia', 'Libero 3', 'Libero 4', 'Libero 5', 'Libero 6'],
    },
    prodotti: {
      decimaliPrezzoVendita: 2,
      decimaliPrezzoAcquisto: 2,
      mostraDimensioniPeso: true,
      codiceAutomatico: true,
      prossimoCodice: '0049',
      tipologiaDefault: 'Art. con magazzino',
      venditaTouch: true,
      campiAggiuntivi: ['Opzioni', 'Garanzia', 'Richiesta', 'Libero 4'],
      incrementaQtaDuplicati: true,
      avvisiSonoriBarcode: true,
    },
    documenti: {
      decimaliQta: '(auto)',
      campiAggiuntivi: ['Desc. preventivo', 'Consegna', 'Libero 3', 'Libero 4'],
      tipi,
    },
    avvisi,
    varie: {
      inviaDiagnostica: false,
      simboloValuta: '€',
      posizioneValuta: 'Sinistra',
      nascondiSimboloRigheCentrali: false,
      numerazReverseCharge: '/RC',
      chiediBolli: true,
      bolliTipo: 'Bolli in fattura',
      bolliSoglia: 77.47,
      bolliAncheOrdiniPreventivi: true,
      ivaPerCassa: false,
    },
  }
}

function mergeDocTipi(raw: Record<string, Partial<DocumentoTipoOptions>> | undefined): Record<string, DocumentoTipoOptions> {
  const base = defaultApplicationOptions().documenti.tipi
  if (!raw) return base
  const out = { ...base }
  for (const [id, patch] of Object.entries(raw)) {
    const baseTipo = base[id] ?? defaultDocTipo(id, DOCUMENT_TYPE_LABELS[id] ?? id)
    out[id] = {
      ...baseTipo,
      ...patch,
      titoloStampa: patch.titoloStampa ?? baseTipo.titoloStampa,
      layoutTemplate: normalizePrintLayoutId(patch.layoutTemplate as string | undefined ?? baseTipo.layoutTemplate),
      template: resolveDocumentTemplateFields(id, { ...baseTipo.template, ...patch.template }),
    }
  }
  return out
}

export function loadApplicationOptions(data: Record<string, unknown> | undefined): ApplicationOptions {
  const defaults = defaultApplicationOptions()
  const raw = data?.appOptions as Partial<ApplicationOptions> | undefined
  if (!raw) return defaults
  return {
    azienda: { ...defaults.azienda, ...raw.azienda },
    moduli: { ...defaults.moduli, ...raw.moduli },
    clienti: {
      ...defaults.clienti,
      ...raw.clienti,
      campiAggiuntivi: raw.clienti?.campiAggiuntivi ?? defaults.clienti.campiAggiuntivi,
    },
    prodotti: {
      ...defaults.prodotti,
      ...raw.prodotti,
      campiAggiuntivi: raw.prodotti?.campiAggiuntivi ?? defaults.prodotti.campiAggiuntivi,
    },
    documenti: {
      ...defaults.documenti,
      ...raw.documenti,
      campiAggiuntivi: raw.documenti?.campiAggiuntivi ?? defaults.documenti.campiAggiuntivi,
      tipi: mergeDocTipi(raw.documenti?.tipi),
    },
    avvisi: { ...defaults.avvisi, ...raw.avvisi },
    varie: { ...defaults.varie, ...raw.varie },
  }
}

export function applicationOptionsToFirestore(appOptions: ApplicationOptions) {
  return { appOptions }
}

/** Sincronizza moduli opzioni con features FixLab già esistenti. */
export function syncFeaturesFromAppOptions(
  appOptions: ApplicationOptions,
  features: { warehouse: boolean; pos: boolean; rtPrinter: boolean },
): typeof features {
  return {
    warehouse: appOptions.moduli.magazzinoGestione,
    pos: appOptions.moduli.venditaTouchscreen || features.pos,
    rtPrinter: appOptions.moduli.registratoreCassa || features.rtPrinter,
  }
}

export function syncAppOptionsFromFeatures(
  appOptions: ApplicationOptions,
  features: { warehouse: boolean; pos: boolean; rtPrinter: boolean; whatsapp: boolean },
): ApplicationOptions {
  return {
    ...appOptions,
    moduli: {
      ...appOptions.moduli,
      magazzinoGestione: features.warehouse,
      venditaTouchscreen: features.pos,
      registratoreCassa: features.rtPrinter,
      ecommerce: features.whatsapp,
    },
  }
}
