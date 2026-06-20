import type { OperazioneMagazzinoMode } from './constants'

/** Causali predefinite per modalità, sullo stile di Danea Easyfatt. */
const DEFAULT_CAUSALI: Record<OperazioneMagazzinoMode, string[]> = {
  load: [
    'Rif. DDT N°  Del ',
    'Carico manuale',
    'Inventario iniziale',
    'Reso da cliente',
    'Carico da fornitore',
  ],
  unload: ['Scarico manuale', 'Vendita', 'Reso a fornitore', 'Scarto', 'Uso interno'],
  adjust: ['Rettifica giacenza', 'Rettifica inventario', 'Inventario fisico'],
}

const STORAGE_PREFIX = 'fixlab-causali-magazzino'

function storageKey(mode: OperazioneMagazzinoMode): string {
  return `${STORAGE_PREFIX}-${mode}`
}

export function loadCausali(mode: OperazioneMagazzinoMode): string[] {
  try {
    const raw = localStorage.getItem(storageKey(mode))
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every(v => typeof v === 'string')) {
        return parsed
      }
    }
  } catch {
    /* ignora errori di parsing */
  }
  return [...DEFAULT_CAUSALI[mode]]
}

export function saveCausali(mode: OperazioneMagazzinoMode, causali: string[]): void {
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(causali))
  } catch {
    /* storage non disponibile */
  }
}
