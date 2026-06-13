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
