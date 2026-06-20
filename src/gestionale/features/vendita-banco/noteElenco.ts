export type NoteCampoKey = 'libero1' | 'libero2' | 'libero3' | 'libero4' | 'noteFine'

export const NOTE_CAMPO_KEYS: NoteCampoKey[] = ['libero1', 'libero2', 'libero3', 'libero4', 'noteFine']

export const NOTE_CAMPO_LABELS: Record<NoteCampoKey, string> = {
  libero1: 'Desc. preventivo',
  libero2: 'Consegna',
  libero3: 'Libero 3',
  libero4: 'Libero 4',
  noteFine: 'Note a fine documento',
}

export const NOTE_ELENCO_DEFAULTS: Record<NoteCampoKey, string[]> = {
  libero1: [
    'Confermato il ...',
    'Validità preventivo 20 gg',
    'Validità preventivo 30 gg',
    'Validità preventivo 40 gg',
    'Validità preventivo 50 gg',
  ],
  libero2: [],
  libero3: [],
  libero4: [],
  noteFine: [],
}

export function noteCampoKeyFromIndex(index: number): NoteCampoKey {
  return NOTE_CAMPO_KEYS[index] ?? 'libero1'
}
