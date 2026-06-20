const PREFIX = 'fixlab_prefs_'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function getCustomNotaTemplates(): string[] {
  return readJson<string[]>('nota_templates', [])
}

export function addCustomNotaTemplate(label: string): string[] {
  const trimmed = label.trim()
  if (!trimmed) return getCustomNotaTemplates()
  const next = [...new Set([...getCustomNotaTemplates(), trimmed])]
  writeJson('nota_templates', next)
  return next
}

export function getCustomGruppi(): string[] {
  return readJson<string[]>('gruppi', [])
}

export function addCustomGruppo(label: string): string[] {
  const trimmed = label.trim()
  if (!trimmed) return getCustomGruppi()
  const next = [...new Set([...getCustomGruppi(), trimmed])]
  writeJson('gruppi', next)
  return next
}

export function getCustomStampaModelli(scope: string): string[] {
  return readJson<string[]>(`stampa_${scope}`, [])
}

export function addCustomStampaModello(scope: string, label: string): string[] {
  const trimmed = label.trim()
  if (!trimmed) return getCustomStampaModelli(scope)
  const next = [...new Set([...getCustomStampaModelli(scope), trimmed])]
  writeJson(`stampa_${scope}`, next)
  return next
}

export function getCustomAgenti(): string[] {
  return readJson<string[]>('agenti', [])
}

export function addCustomAgente(nome: string): string[] {
  const trimmed = nome.trim()
  if (!trimmed) return getCustomAgenti()
  const next = [...new Set([...getCustomAgenti(), trimmed])]
  writeJson('agenti', next)
  return next
}

export function getCustomNoteDocumento(): string[] {
  return readJson<string[]>('note_doc', [])
}

export function addCustomNotaDocumento(label: string): string[] {
  const trimmed = label.trim()
  if (!trimmed) return getCustomNoteDocumento()
  const next = [...new Set([...getCustomNoteDocumento(), trimmed])]
  writeJson('note_doc', next)
  return next
}

export type NoteElencoVoce = {
  id: string
  text: string
  predefinita: boolean
}

function readNoteElencoStore(): Partial<Record<string, NoteElencoVoce[]>> {
  return readJson<Partial<Record<string, NoteElencoVoce[]>>>('note_elenco', {})
}

function writeNoteElencoStore(store: Partial<Record<string, NoteElencoVoce[]>>): void {
  writeJson('note_elenco', store)
}

export function getNoteElencoVoci(campoKey: string, defaults: string[] = []): NoteElencoVoce[] {
  const stored = readNoteElencoStore()[campoKey]
  if (stored?.length) return stored.map(v => ({ ...v }))

  const legacy = campoKey === 'libero1' ? getCustomNoteDocumento() : []
  const seed = legacy.length ? legacy : defaults
  return seed.map((text, i) => ({
    id: `seed-${campoKey}-${i}`,
    text,
    predefinita: i === 0 && seed.length > 0,
  }))
}

export function saveNoteElencoVoci(campoKey: string, voci: NoteElencoVoce[]): void {
  const store = readNoteElencoStore()
  store[campoKey] = voci.map(v => ({ ...v, text: v.text.trim() })).filter(v => v.text)
  writeNoteElencoStore(store)
}

export function getNoteElencoPresetLabels(campoKey: string, defaults: string[] = []): string[] {
  return getNoteElencoVoci(campoKey, defaults)
    .map(v => v.text.trim())
    .filter(Boolean)
}

export function getNoteElencoPredefinita(campoKey: string, defaults: string[] = []): string {
  const voci = getNoteElencoVoci(campoKey, defaults)
  return voci.find(v => v.predefinita)?.text ?? voci[0]?.text ?? ''
}

export function getCustomCampiFE(): string[] {
  return readJson<string[]>('campi_fe', [])
}

export function addCustomCampoFE(code: string): string[] {
  const trimmed = code.trim()
  if (!trimmed) return getCustomCampiFE()
  const next = [...new Set([...getCustomCampiFE(), trimmed])]
  writeJson('campi_fe', next)
  return next
}

export function getCustomCommentiInterni(): string[] {
  return readJson<string[]>('commenti_interni', [])
}

export function addCustomCommentoInterno(label: string): string[] {
  const trimmed = label.trim()
  if (!trimmed) return getCustomCommentiInterni()
  const next = [...new Set([...getCustomCommentiInterni(), trimmed])]
  writeJson('commenti_interni', next)
  return next
}

export function getCustomTipiPagamento(): string[] {
  return readJson<string[]>('tipi_pagamento', [])
}

export function addCustomTipoPagamento(label: string): string[] {
  const trimmed = label.trim()
  if (!trimmed) return getCustomTipiPagamento()
  const next = [...new Set([...getCustomTipiPagamento(), trimmed])]
  writeJson('tipi_pagamento', next)
  return next
}

export type CustomCalcolataTemplate = {
  label: string
  percent?: number
  amount?: number
}

export function getCustomCalcolataTemplates(): CustomCalcolataTemplate[] {
  return readJson<CustomCalcolataTemplate[]>('calcolata_templates', [])
}

export function addCustomCalcolataTemplate(entry: CustomCalcolataTemplate): CustomCalcolataTemplate[] {
  const label = entry.label.trim()
  if (!label) return getCustomCalcolataTemplates()
  const next = [...getCustomCalcolataTemplates().filter(t => t.label !== label), { ...entry, label }]
  writeJson('calcolata_templates', next)
  return next
}
