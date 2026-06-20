import {
  DOCUMENT_TYPE_LABELS,
  resolveDocumentTemplateFields,
  type DocumentoTipoOptions,
  type PrintLayoutId,
} from './applicationOptions'
import { DEFAULT_CONFERMA_ORDINE_DISCLAIMER } from './confermaOrdineTemplate'

/**
 * Modello di stampa in stile Danea Easyfatt.
 * Ogni modello definisce un nome, una categoria e gli override applicati
 * alle opzioni di stampa del tipo di documento.
 */
export type StampaModelloOptions = Partial<Omit<DocumentoTipoOptions, 'template'>> & {
  template?: Partial<DocumentoTipoOptions['template']>
}

export type StampaModello = {
  id: string
  name: string
  category: string
  builtIn?: boolean
  options: StampaModelloOptions
}

const PREFIX = 'fixlab_prefs_'

function storeKey(scope: string): string {
  return `${PREFIX}stampa_models_${scope}`
}

function readStore(scope: string): StampaModello[] | null {
  try {
    const raw = localStorage.getItem(storeKey(scope))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StampaModello[]
    if (Array.isArray(parsed) && parsed.length) return parsed
    return null
  } catch {
    return null
  }
}

function writeStore(scope: string, models: StampaModello[]): void {
  try {
    localStorage.setItem(storeKey(scope), JSON.stringify(models))
  } catch {
    /* ignore quota errors */
  }
}

/** Tutti gli scope documento con modelli di stampa personalizzabili. */
export const ALL_STAMPA_SCOPES = [
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

export type StampaScope = (typeof ALL_STAMPA_SCOPES)[number]

export type StampaModelloEntry = StampaModello & {
  scope: StampaScope
}

export function stampaModelloKey(scope: string, id: string): string {
  return `${scope}::${id}`
}

export function parseStampaModelloKey(key: string): { scope: string; id: string } | null {
  const sep = key.indexOf('::')
  if (sep <= 0) return null
  return { scope: key.slice(0, sep), id: key.slice(sep + 2) }
}

export function getAllStampaModelli(): StampaModelloEntry[] {
  const entries: StampaModelloEntry[] = []
  for (const scope of ALL_STAMPA_SCOPES) {
    for (const model of getStampaModelli(scope)) {
      entries.push({ ...model, scope })
    }
  }
  return entries.sort((a, b) => {
    const scopeDelta = ALL_STAMPA_SCOPES.indexOf(a.scope) - ALL_STAMPA_SCOPES.indexOf(b.scope)
    if (scopeDelta !== 0) return scopeDelta
    return a.name.localeCompare(b.name, 'it')
  })
}

export function getStampaScopeLabel(scope: string): string {
  const typeId = scopeToDocumentTypeId(scope)
  return DOCUMENT_TYPE_LABELS[typeId] ?? typeId
}

/** Documento di tipo "scope" → typeId usato dalle opzioni applicazione. */
export function scopeToDocumentTypeId(scope: string): string {
  return scope === 'vendita_banco' ? 'vendita_banco' : scope
}

/**
 * Modello "Conferma d'ordine" — riproduce esattamente il documento Danea:
 * intestazione studio, riquadro cliente, riquadro informazioni dispositivo,
 * tabella righe, firma per accettazione, acconto, totale e disclaimer.
 */
function confermaOrdineModel(): StampaModello {
  return {
    id: 'conferma-ordine-std',
    name: "Conferma d'ordine",
    category: "Conferma d'ordine",
    builtIn: true,
    options: {
      titoloStampa: "Conferma d'ordine",
      layoutTemplate: 'layout_conferma_ordine',
      noteFine: DEFAULT_CONFERMA_ORDINE_DISCLAIMER,
      template: {
        clientBoxTitle: 'Cliente',
        secondBoxTitle: 'Informazioni dispositivo',
        showSecondBox: true,
        signatureLabel: 'Firma per accettazione',
        totalLabel: 'Tot. documento',
      },
    },
  }
}

function genericModel(typeId: string, label: string, layout: PrintLayoutId): StampaModello {
  return {
    id: `${typeId}-std`,
    name: label,
    category: label,
    builtIn: true,
    options: {
      titoloStampa: label,
      layoutTemplate: layout,
    },
  }
}

/** Varianti di stampa per la vendita al banco (stile Danea). */
const VENDITA_BANCO_MODELLI = [
  'Vendita a pubblico (docum.)',
  'Vendita al pubblico (silver)',
  'Vendita al pubblico (completo)',
  'Ricevuta fiscale',
  'Documento interno',
]

/** Modelli predefiniti (non persistiti finché non si modifica l'elenco). */
function builtInModelsFor(scope: string): StampaModello[] {
  if (scope === 'ordine_cliente') {
    return [confermaOrdineModel()]
  }
  if (scope === 'ddt') {
    return [
      {
        id: 'ddt-std',
        name: 'Doc. di trasporto',
        category: 'Documento di trasporto',
        builtIn: true,
        options: {
          titoloStampa: 'Doc. di trasporto',
          layoutTemplate: 'layout_conferma_ordine' as PrintLayoutId,
        },
      },
    ]
  }
  if (scope === 'vendita_banco') {
    return VENDITA_BANCO_MODELLI.map((name, i) => ({
      id: `vendita-banco-${i}`,
      name,
      category: 'Vendita al banco',
      builtIn: true,
      options: {
        titoloStampa: name,
        layoutTemplate: 'vendita_banco_gestionale' as PrintLayoutId,
      },
    }))
  }
  const typeId = scopeToDocumentTypeId(scope)
  const label = DOCUMENT_TYPE_LABELS[typeId] ?? typeId
  return [genericModel(typeId, label, 'layout_conferma_ordine')]
}

export function getStampaModelli(scope: string): StampaModello[] {
  return readStore(scope) ?? builtInModelsFor(scope)
}

export function saveStampaModelli(scope: string, models: StampaModello[]): StampaModello[] {
  const next = models.length ? models : builtInModelsFor(scope)
  writeStore(scope, next)
  return next
}

function uniqueName(models: StampaModello[], base: string): string {
  const names = new Set(models.map(m => m.name.toLowerCase()))
  if (!names.has(base.toLowerCase())) return base
  let n = 2
  while (names.has(`${base} (${n})`.toLowerCase())) n += 1
  return `${base} (${n})`
}

/** Nome proposto di default quando si duplica un modello (stile Danea: "Nome (2)"). */
export function suggestDuplicateName(models: StampaModello[], source: StampaModello): string {
  return uniqueName(models, source.name)
}

export function addStampaModello(
  scope: string,
  source: StampaModello,
  name: string,
): { models: StampaModello[]; created: StampaModello } {
  const models = getStampaModelli(scope)
  const finalName = uniqueName(models, name.trim() || source.name)
  const created: StampaModello = {
    id: `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: finalName,
    category: source.category,
    builtIn: false,
    options: {
      ...source.options,
      template: source.options.template ? { ...source.options.template } : undefined,
    },
  }
  const next = saveStampaModelli(scope, [...models, created])
  return { models: next, created }
}

export function renameStampaModello(scope: string, id: string, name: string): StampaModello[] {
  const models = getStampaModelli(scope)
  const trimmed = name.trim()
  if (!trimmed) return models
  const target = models.find(m => m.id === id)
  if (!target) return models
  const finalName = trimmed.toLowerCase() === target.name.toLowerCase() ? trimmed : uniqueName(models, trimmed)
  return saveStampaModelli(
    scope,
    models.map(m => (m.id === id ? { ...m, name: finalName } : m)),
  )
}

export function deleteStampaModello(scope: string, id: string): StampaModello[] {
  const models = getStampaModelli(scope)
  if (models.length <= 1) return models
  return saveStampaModelli(
    scope,
    models.filter(m => m.id !== id),
  )
}

export function updateStampaModelloOptions(
  scope: string,
  id: string,
  options: StampaModelloOptions,
): StampaModello[] {
  const models = getStampaModelli(scope)
  return saveStampaModelli(
    scope,
    models.map(m => (m.id === id ? { ...m, options } : m)),
  )
}

/** Applica gli override del modello alle opzioni di stampa del tipo documento. */
export function applyModelloToPrintOptions(
  base: DocumentoTipoOptions,
  modello: StampaModello | undefined,
  typeId: string,
): DocumentoTipoOptions {
  if (!modello) return base
  const o = modello.options
  return {
    ...base,
    ...o,
    titoloStampa: o.titoloStampa ?? base.titoloStampa,
    noteFine: o.noteFine ?? base.noteFine,
    layoutTemplate: o.layoutTemplate ?? base.layoutTemplate,
    template: resolveDocumentTemplateFields(typeId, { ...base.template, ...o.template }),
  }
}
